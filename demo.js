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

    /* The ‘addMiloticRGB’ generates palette for a #rrggbb color as is.
     * @param {title} color title
     * @param {rgbc} color format , accepts argb and rgb with or without leading hash
     */

    var addMiloticRGB = function(title, rgbc) {
      var colors;
      var p=1;
      if ( rgbc.length === 6) { p=0; } 
      else if ( rgbc.length === 8) { p=2; }
      else if ( rgbc.length === 9) { p=3; }

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

    /* The ‘addMilotic’ generates palette for a #rrggbb color considering luminance.
     * @param {title} color title
     * @param {rgbc} color format , accepts argb and rgb with or without leading hash
     * @param {lrc} luminance range control, defaults to 0.05 ( range [0.05,0.95] )
     */

    var addMilotic = function(title, rgbc, lrc=0.05) {
      var colors;
      var rgbval = rgbc;
      if ( rgbc.length === 6) { rgbval = '#' + rgbc ; } 
      else if ( rgbc.length === 8) { rgbval = '#' + rgbc.slice(2,8) ; } 
      else if ( rgbc.length === 9) { rgbval = '#' + rgbc.slice(3,9) ; } 

      const [ hh, ss, ll ] = chroma(rgbval).hsl();
      const dval = '' + chroma.hsl(Math.floor(hh), ss, ll).hex();

      var fx = function(x) {
        var xval = chroma(dval).luminance(lrc + (1.0-2*lrc)*x).hex();
        console.log('x=', x, dval, xval);
        const r = parseInt(xval.slice(1,3),16);
        const g = parseInt(xval.slice(3,5),16);
        const b = parseInt(xval.slice(5,7),16);
        console.log('x=', x, dval, xval);
        return palette.rgbColor( r/256, g/256, b/256 );
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

    addHeading('addMiloticRGB gradients for palette.js RGB examples');
    addMiloticRGB('Red','#ffff0000');
    addMiloticRGB('Green','#ff00ff00');
    addMiloticRGB('Blue','#ff0000ff');
    addMiloticRGB('Yellow','#ffffff00');
    addMiloticRGB('Magenta','#ffff00ff');
    addMiloticRGB('Cyan','#ff00ffff');
    addMiloticRGB('Grayscale','#ffffffff');

    addHeading('addMilotic gradients from same palette.js RGB examples');

    addMilotic('Red','#ffff0000');
    addMilotic('Green','#ff00ff00');
    addMilotic('Blue','#ff0000ff');
    addMilotic('Yellow','#ffffff00');
    addMilotic('Magenta','#ffff00ff');
    addMilotic('Cyan','#ff00ffff');
    addMilotic('Grayscale','#ffffffff');

    addHeading('Milotic gradients with all pencil colors');

    addMilotic('alice blue','#fff0f8ff');
    addMilotic('antique white','#fffaebd7');
    addMilotic('aqua','#ff00ffff');
    addMilotic('aquamarine','#ff7fffd4');
    addMilotic('azure','#fff0ffff');
    addMilotic('beige','#fff5f5dc');
    addMilotic('bisque','#ffffe4c4');
    addMilotic('black','#ff000000');
    addMilotic('blanched almond','#ffffebcd');
    addMilotic('blue','#ff0000ff');
    addMilotic('blue violet','#ff8a2be2');
    addMilotic('brown','#ffa52a2a');
    addMilotic('burly wood','#ffdeb887');
    addMilotic('cadet blue','#ff5f9ea0');
    addMilotic('chartreuse','#ff7fff00');
    addMilotic('chocolate','#ffd2691e');
    addMilotic('coral','#ffff7f50');
    addMilotic('cornflower blue','#ff6495ed');
    addMilotic('cornsilk','#fffff8dc');
    addMilotic('crimson','#ffdc143c');
    addMilotic('cyan','#ff00ffff');
    addMilotic('dark blue','#ff00008b');
    addMilotic('dark cyan','#ff008b8b');
    addMilotic('dark goldenrod','#ffb8860b');
    addMilotic('dark gray','#ffa9a9a9');
    addMilotic('dark green','#ff006400');
    addMilotic('dark khaki','#ffbdb76b');
    addMilotic('dark magenta','#ff8b008b');
    addMilotic('dark olive green','#ff556b2f');
    addMilotic('dark orange','#ffff8c00');
    addMilotic('dark orchid','#ff9932cc');
    addMilotic('dark red','#ff8b0000');
    addMilotic('dark salmon','#ffe9967a');
    addMilotic('dark sea green','#ff8fbc8f');
    addMilotic('dark slate blue','#ff483d8b');
    addMilotic('dark slate gray','#ff2f4f4f');
    addMilotic('dark turquoise','#ff00ced1');
    addMilotic('dark violet','#ff9400d3');
    addMilotic('deep pink','#ffff1493');
    addMilotic('deep sky blue','#ff00bfff');
    addMilotic('dim gray','#ff696969');
    addMilotic('dodger blue','#ff1e90ff');
    addMilotic('firebrick','#ffb22222');
    addMilotic('floral white','#fffffaf0');
    addMilotic('forest green','#ff228b22');
    addMilotic('fuchsia','#ffff00ff');
    addMilotic('gainsboro','#ffdcdcdc');
    addMilotic('ghost white','#fff8f8ff');
    addMilotic('gold','#ffffd700');
    addMilotic('goldenrod','#ffdaa520');
    addMilotic('gray','#ff808080');
    addMilotic('green','#ff008000');
    addMilotic('green yellow','#ffadff2f');
    addMilotic('honeydew','#fff0fff0');
    addMilotic('hot pink','#ffff69b4');
    addMilotic('indian red','#ffcd5c5c');
    addMilotic('indigo','#ff4b0082');
    addMilotic('ivory','#fffffff0');
    addMilotic('khaki','#fff0e68c');
    addMilotic('lavender','#ffe6e6fa');
    addMilotic('lavender blush','#fffff0f5');
    addMilotic('lawn green','#ff7cfc00');
    addMilotic('lemon chiffon','#fffffacd');
    addMilotic('light blue','#ffadd8e6');
    addMilotic('light coral','#fff08080');
    addMilotic('light cyan','#ffe0ffff');
    addMilotic('light goldenrod yellow','#fffafad2');
    addMilotic('light gray','#ffd3d3d3');
    addMilotic('light green','#ff90ee90');
    addMilotic('light pink','#ffffb6c1');
    addMilotic('light salmon','#ffffa07a');
    addMilotic('light sea green','#ff20b2aa');
    addMilotic('light sky blue','#ff87cefa');
    addMilotic('light slate gray','#ff778899');
    addMilotic('light steel blue','#ffb0c4de');
    addMilotic('light yellow','#ffffffe0');
    addMilotic('lime','#ff00ff00');
    addMilotic('lime green','#ff32cd32');
    addMilotic('linen','#fffaf0e6');
    addMilotic('magenta','#ffff00ff');
    addMilotic('maroon','#ff800000');
    addMilotic('medium aquamarine','#ff66cdaa');
    addMilotic('medium blue','#ff0000cd');
    addMilotic('medium orchid','#ffba55d3');
    addMilotic('medium purple','#ff9370db');
    addMilotic('medium sea green','#ff3cb371');
    addMilotic('medium slate blue','#ff7b68ee');
    addMilotic('medium spring green','#ff00fa9a');
    addMilotic('medium turquoise','#ff48d1cc');
    addMilotic('medium violet red','#ffc71585');
    addMilotic('midnight blue','#ff191970');
    addMilotic('mint cream','#fff5fffa');
    addMilotic('misty rose','#ffffe4e1');
    addMilotic('moccasin','#ffffe4b5');
    addMilotic('navajo white','#ffffdead');
    addMilotic('navy','#ff000080');
    addMilotic('old lace','#fffdf5e6');
    addMilotic('olive','#ff808000');
    addMilotic('olive drab','#ff6b8e23');
    addMilotic('orange','#ffffa500');
    addMilotic('orange red','#ffff4500');
    addMilotic('orchid','#ffda70d6');
    addMilotic('pale goldenrod','#ffeee8aa');
    addMilotic('pale green','#ff98fb98');
    addMilotic('pale turquoise','#ffafeeee');
    addMilotic('pale violet red','#ffdb7093');
    addMilotic('papaya whip','#ffffefd5');
    addMilotic('peach puff','#ffffdab9');
    addMilotic('peru','#ffcd853f');
    addMilotic('pink','#ffffc0cb');
    addMilotic('plum','#ffdda0dd');
    addMilotic('powder blue','#ffb0e0e6');
    addMilotic('purple','#ff800080');
    addMilotic('red','#ffff0000');
    addMilotic('rosy brown','#ffbc8f8f');
    addMilotic('royal blue','#ff4169e1');
    addMilotic('saddle brown','#ff8b4513');
    addMilotic('salmon','#fffa8072');
    addMilotic('sandy brown','#fff4a460');
    addMilotic('sea green','#ff2e8b57');
    addMilotic('sea shell','#fffff5ee');
    addMilotic('sienna','#ffa0522d');
    addMilotic('silver','#ffc0c0c0');
    addMilotic('sky blue','#ff87ceeb');
    addMilotic('slate blue','#ff6a5acd');
    addMilotic('slate gray','#ff708090');
    addMilotic('snow','#fffffafa');
    addMilotic('spring green','#ff00ff7f');
    addMilotic('steel blue','#ff4682b4');
    addMilotic('tan','#ffd2b48c');
    addMilotic('teal','#ff008080');
    addMilotic('thistle','#ffd8bfd8');
    addMilotic('tomato','#ffff6347');
    addMilotic('turquoise','#ff40e0d0');
    addMilotic('violet','#ffee82ee');
    addMilotic('wheat','#fff5deb3');
    addMilotic('white','#ffffffff');
    addMilotic('white smoke','#fff5f5f5');
    addMilotic('yellow','#ffffff00');
    addMilotic('yellow green','#ff9acd32');

  };

  var el = document.getElementsByTagName('form')[0];
  el.addEventListener('input', regenerate, false);
  el.addEventListener('change', regenerate, false);
  regenerate();
})();
