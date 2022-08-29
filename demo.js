'use strict';

(function() {
  var byId = document.getElementById.bind(document);
  var transformColors = function(colors, callback) {
    if (!callback) {
      return colors;
    }
    return colors.map(function(color) {
      var c = parseInt(color, 16);
      return callback(c >> 16, (c >> 8) & 255, c & 255).map(function(v) {
        v = Math.floor(v);
        v = Number(v > 0 ? (v < 255 ? v : 255) : 0).toString(16);
        return v.length == 1 ? '0' + v : v;
      }).join('');
    });
  };

  var blindnessFilters = {
    green: {
      name: 'Green-blindness (6% of men, 0.4% of women)',
      func: function(r, g, b) {
        r = Math.pow(r, 2.2);
        g = Math.pow(g, 2.2);
        b = Math.pow(b, 2.2);
        var R = Math.pow(0.02138 + 0.677 * g + 0.2802 * r, 1 / 2.2);
        var B = Math.pow(0.02138 * (1 + g - r) + 0.9572 * b, 1 / 2.2);
        return [R, R, B];
      }
    },
    red: {
      name: 'Red-blindness (2.5% of men)',
      func: function(r, g, b) {
        r = Math.pow(r, 2.2);
        g = Math.pow(g, 2.2);
        b = Math.pow(b, 2.2);
        var R = Math.pow(0.003974 + 0.8806 * g + 0.1115 * r, 1 / 2.2);
        var B = Math.pow(0.003974 * (1 - g + r) + 0.9921 * b, 1 / 2.2);
        return [R, R, B];
      }
    },
    gray: {
      name: 'Grayscale',
      func: function(r, g, b) {
        g = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return [g, g, g];
      }
    }
  };
  (function(select) {
    var keys = [];
    for (var key in blindnessFilters) {
      keys.push(key);
    }
    keys.sort();
    for (var i = 0; (key = keys[i]); ++i) {
      var option = document.createElement('option');
      option.value = key;
      option.appendChild(document.createTextNode(blindnessFilters[key].name));
      select.appendChild(option);
    }
  })(byId('blindness'));


  var createDom = function(tag, opt_attrs, varargs) {
    var el = document.createElement(tag);
    if (opt_attrs) {
      for (var name in opt_attrs) {
        el.setAttribute(name, opt_attrs[name]);
      }
    }
    for (var i = 2, child; (child = arguments[i]); ++i) {
      if (typeof child === 'string') {
        child = document.createTextNode(child);
      }
      el.appendChild(child);
    }
    return el;
  };


  var createColorRow = function(colors, title) {
    var row = createDom('tr', null,
                        createDom('td'),
                        createDom('td', null, title));

    if (colors) {
      var width = Math.max(Math.round(500 / colors.length), 5);
      var cell = document.createElement('td');
      row.firstChild.innerHTML = colors.map(function(color) {
        return '<span style="background: #' + color + '; width: ' + width + 'px"></span>';
      }).join('');
    } else {
      row.firstChild.innerHTML = 'Too many colours requested.';
    }

    return row;
  };


  var palettes = byId('palettes');
  var defaultBackground = palettes.style.backgroundColor;
  var tooltip = byId('tooltip');

  function hex(x) {
    return ('0' + parseInt(x).toString(16)).slice(-2);
  }

  function rgbToHex(rgb) {
    var match = rgb && rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(,\s*\d+\.*\d+)?\)$/);
    return match ? ('#' + hex(match[1]) + hex(match[2]) + hex(match[3])).toUpperCase() : '';
  }

  var mouseMoveHandler = function(e) {
    var target = e.target, bg;
    if (tooltip.firstChild) {
      tooltip.removeChild(tooltip.firstChild);
    }
    if (target && target.nodeName == 'SPAN') {
      bg = target.style.backgroundColor;
    }
    bg = bg || defaultBackground;
    var colStr = bg + '\u2003' + rgbToHex(bg)
    tooltip.appendChild(document.createTextNode(colStr));
    tooltip.style.display = bg ? '' : 'none';
    palettes.style.backgroundColor = bg;
  };
  palettes.addEventListener('mousemove', mouseMoveHandler, false);
  palettes.addEventListener('mouseover', mouseMoveHandler, false);

  palettes.addEventListener('click', function(e) {
    var target = e.target;
    if (target && target.nodeName == 'SPAN') {
      defaultBackground = target.style.backgroundColor || defaultBackground;
    }
  }, false);

  var regenerate = function() {
    var transform = blindnessFilters[byId('blindness').value];
    transform = transform ? transform.func : null;
    var num = parseInt(byId('number').value, 10);
    num = num > 1 ? num < 100 ? num : 100 : 1;

    while (palettes.firstChild) {
      palettes.removeChild(palettes.firstChild);
    }

    var table = document.createElement('table'), tbody;
    palettes.appendChild(table);

    var addHeading = function(title) {
      tbody = createDom('tbody', null,
                        createDom('tr', null,
                                  createDom('th', { colspan: '2' },
                                            title)));
      table.appendChild(tbody);
    };

    var add = function(title, name, varargs) {
      var colors;
      if (typeof name === typeof add && !name.scheme_name) {
        colors = palette.generate(name, num);
      } else {
        var scheme = name;
        if (typeof name === 'string') {
          title = name + ': ' + title;
          scheme = palette.listSchemes(name)[0];
        }
        var args = Array.prototype.slice.call(arguments, 1);
        args[0] = num;
        colors = scheme.apply(scheme, args);
      }
      if (colors) {
        colors = transformColors(colors, transform);
      }
      tbody.appendChild(createColorRow(colors, title || name));
    };

    var addMilotic = function(title, rgbc) {
      var colors;
      const p = ( rgbc.length === 8) ? 2 : 0;
      const r = parseInt(rgbc.slice(p, p+2), 16);
      const g = parseInt(rgbc.slice(p+2, p+4), 16);
      const b = parseInt(rgbc.slice(p+4, p+6), 16);

      var fx = function(x) {
        return palette.rgbColor(x*r/256, x*g/256, x*b/256);
      };
      colors = palette.generate(fx, num);
      if (colors) {
        colors = transformColors(colors, transform);
      }
      tbody.appendChild(createColorRow(colors, title));
    };

    /** start here */

    addHeading('Milotic Default palettes');
    add('Milotic base colours', 'milotic-msdef');
    add('Milotic all colours', 'milotic-pencil');

    addHeading('Make your own gradients');
    addMilotic('Grayscale', 'ffffff' );
    addMilotic('Red', 'ff0000' );

  };

  var el = document.getElementsByTagName('form')[0];
  el.addEventListener('input', regenerate, false);
  el.addEventListener('change', regenerate, false);
  regenerate();
})();
