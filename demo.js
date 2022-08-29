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
      var rgbval = rgbc;
      // default is '#rrggbb' , other variants are converted
      if ( rgbc.length === 6) { rgbval = '#' + rgbc ; } 
      else if ( rgbc.length === 8) { rgbval = '#' + rgbc.slice(2,8) ; } 
      else if ( rgbc.length === 9) { rgbval = '#' + rgbc.slice(3,9) ; } 

      const [ hh, ss, ll ] = chroma(rgbval).hsl();
      const dval = '' + chroma.hsl(Math.floor(hh), ss, ll).hex();

      var fx = function(x) {
        var xval = chroma(dval).luminance(0.05 + 0.9 * x).hex();
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

    addHeading('RGB gradients from palette.js');
    add('Red', function(x) { return palette.rgbColor(x, 0, 0); });
    add('Green', function(x) { return palette.rgbColor(0, x, 0); });
    add('Blue', function(x) { return palette.rgbColor(0, 0, x); });
    add('Yellow', function(x) { return palette.rgbColor(x, x, 0); });
    add('Magenta', function(x) { return palette.rgbColor(x, 0, x); });
    add('Cyan', function(x) { return palette.rgbColor(0, x, x); });
    add('Grayscale', function(x) { return palette.rgbColor(x, x, x); });

    addHeading('Milotic Default palettes');
    add('Milotic base colours', 'milotic-msdef');
    add('Milotic all colours', 'milotic-pencil');

    addHeading('Milotic gradients, note the color order');

    addMilotic('Red','#ffff0000');
    addMilotic('Green','#ff00ff00');
    addMilotic('Blue','#ff0000ff');
    addMilotic('Yellow','#ffffff00');
    addMilotic('Magenta','#ffff00ff');
    addMilotic('Cyan','#ff00ffff');
    addMilotic('Grayscale','#ff000000');

    addHeading('Milotic gradients with all pencil colors');

    addMilotic('CP_ALICE_BLUE','#fff0f8ff');
    addMilotic('CP_ANTIQUE_WHITE','#fffaebd7');
    addMilotic('CP_AQUA','#ff00ffff');
    addMilotic('CP_AQUAMARINE','#ff7fffd4');
    addMilotic('CP_AZURE','#fff0ffff');
    addMilotic('CP_BEIGE','#fff5f5dc');
    addMilotic('CP_BISQUE','#ffffe4c4');
    addMilotic('CP_BLACK','#ff000000');
    addMilotic('CP_BLANCHED_ALMOND','#ffffebcd');
    addMilotic('CP_BLUE','#ff0000ff');
    addMilotic('CP_BLUE_VIOLET','#ff8a2be2');
    addMilotic('CP_BROWN','#ffa52a2a');
    addMilotic('CP_BURLY_WOOD','#ffdeb887');
    addMilotic('CP_CADET_BLUE','#ff5f9ea0');
    addMilotic('CP_CHARTREUSE','#ff7fff00');
    addMilotic('CP_CHOCOLATE','#ffd2691e');
    addMilotic('CP_CORAL','#ffff7f50');
    addMilotic('CP_CORNFLOWER_BLUE','#ff6495ed');
    addMilotic('CP_CORNSILK','#fffff8dc');
    addMilotic('CP_CRIMSON','#ffdc143c');
    addMilotic('CP_CYAN','#ff00ffff');
    addMilotic('CP_DARK_BLUE','#ff00008b');
    addMilotic('CP_DARK_CYAN','#ff008b8b');
    addMilotic('CP_DARK_GOLDENROD','#ffb8860b');
    addMilotic('CP_DARK_GRAY','#ffa9a9a9');
    addMilotic('CP_DARK_GREEN','#ff006400');
    addMilotic('CP_DARK_KHAKI','#ffbdb76b');
    addMilotic('CP_DARK_MAGENTA','#ff8b008b');
    addMilotic('CP_DARK_OLIVE_GREEN','#ff556b2f');
    addMilotic('CP_DARK_ORANGE','#ffff8c00');
    addMilotic('CP_DARK_ORCHID','#ff9932cc');
    addMilotic('CP_DARK_RED','#ff8b0000');
    addMilotic('CP_DARK_SALMON','#ffe9967a');
    addMilotic('CP_DARK_SEA_GREEN','#ff8fbc8f');
    addMilotic('CP_DARK_SLATE_BLUE','#ff483d8b');
    addMilotic('CP_DARK_SLATE_GRAY','#ff2f4f4f');
    addMilotic('CP_DARK_TURQUOISE','#ff00ced1');
    addMilotic('CP_DARK_VIOLET','#ff9400d3');
    addMilotic('CP_DEEP_PINK','#ffff1493');
    addMilotic('CP_DEEP_SKY_BLUE','#ff00bfff');
    addMilotic('CP_DIM_GRAY','#ff696969');
    addMilotic('CP_DODGER_BLUE','#ff1e90ff');
    addMilotic('CP_FIREBRICK','#ffb22222');
    addMilotic('CP_FLORAL_WHITE','#fffffaf0');
    addMilotic('CP_FOREST_GREEN','#ff228b22');
    addMilotic('CP_FUCHSIA','#ffff00ff');
    addMilotic('CP_GAINSBORO','#ffdcdcdc');
    addMilotic('CP_GHOST_WHITE','#fff8f8ff');
    addMilotic('CP_GOLD','#ffffd700');
    addMilotic('CP_GOLDENROD','#ffdaa520');
    addMilotic('CP_GRAY','#ff808080');
    addMilotic('CP_GREEN','#ff008000');
    addMilotic('CP_GREEN_YELLOW','#ffadff2f');
    addMilotic('CP_HONEYDEW','#fff0fff0');
    addMilotic('CP_HOT_PINK','#ffff69b4');
    addMilotic('CP_INDIAN_RED','#ffcd5c5c');
    addMilotic('CP_INDIGO','#ff4b0082');
    addMilotic('CP_IVORY','#fffffff0');
    addMilotic('CP_KHAKI','#fff0e68c');
    addMilotic('CP_LAVENDER','#ffe6e6fa');
    addMilotic('CP_LAVENDER_BLUSH','#fffff0f5');
    addMilotic('CP_LAWN_GREEN','#ff7cfc00');
    addMilotic('CP_LEMON_CHIFFON','#fffffacd');
    addMilotic('CP_LIGHT_BLUE','#ffadd8e6');
    addMilotic('CP_LIGHT_CORAL','#fff08080');
    addMilotic('CP_LIGHT_CYAN','#ffe0ffff');
    addMilotic('CP_LIGHT_GOLDENROD_YELLOW','#fffafad2');
    addMilotic('CP_LIGHT_GRAY','#ffd3d3d3');
    addMilotic('CP_LIGHT_GREEN','#ff90ee90');
    addMilotic('CP_LIGHT_PINK','#ffffb6c1');
    addMilotic('CP_LIGHT_SALMON','#ffffa07a');
    addMilotic('CP_LIGHT_SEA_GREEN','#ff20b2aa');
    addMilotic('CP_LIGHT_SKY_BLUE','#ff87cefa');
    addMilotic('CP_LIGHT_SLATE_GRAY','#ff778899');
    addMilotic('CP_LIGHT_STEEL_BLUE','#ffb0c4de');
    addMilotic('CP_LIGHT_YELLOW','#ffffffe0');
    addMilotic('CP_LIME','#ff00ff00');
    addMilotic('CP_LIME_GREEN','#ff32cd32');
    addMilotic('CP_LINEN','#fffaf0e6');
    addMilotic('CP_MAGENTA','#ffff00ff');
    addMilotic('CP_MAROON','#ff800000');
    addMilotic('CP_MEDIUM_AQUAMARINE','#ff66cdaa');
    addMilotic('CP_MEDIUM_BLUE','#ff0000cd');
    addMilotic('CP_MEDIUM_ORCHID','#ffba55d3');
    addMilotic('CP_MEDIUM_PURPLE','#ff9370db');
    addMilotic('CP_MEDIUM_SEA_GREEN','#ff3cb371');
    addMilotic('CP_MEDIUM_SLATE_BLUE','#ff7b68ee');
    addMilotic('CP_MEDIUM_SPRING_GREEN','#ff00fa9a');
    addMilotic('CP_MEDIUM_TURQUOISE','#ff48d1cc');
    addMilotic('CP_MEDIUM_VIOLET_RED','#ffc71585');
    addMilotic('CP_MIDNIGHT_BLUE','#ff191970');
    addMilotic('CP_MINT_CREAM','#fff5fffa');
    addMilotic('CP_MISTY_ROSE','#ffffe4e1');
    addMilotic('CP_MOCCASIN','#ffffe4b5');
    addMilotic('CP_NAVAJO_WHITE','#ffffdead');
    addMilotic('CP_NAVY','#ff000080');
    addMilotic('CP_OLD_LACE','#fffdf5e6');
    addMilotic('CP_OLIVE','#ff808000');
    addMilotic('CP_OLIVE_DRAB','#ff6b8e23');
    addMilotic('CP_ORANGE','#ffffa500');
    addMilotic('CP_ORANGE_RED','#ffff4500');
    addMilotic('CP_ORCHID','#ffda70d6');
    addMilotic('CP_PALE_GOLDENROD','#ffeee8aa');
    addMilotic('CP_PALE_GREEN','#ff98fb98');
    addMilotic('CP_PALE_TURQUOISE','#ffafeeee');
    addMilotic('CP_PALE_VIOLET_RED','#ffdb7093');
    addMilotic('CP_PAPAYA_WHIP','#ffffefd5');
    addMilotic('CP_PEACH_PUFF','#ffffdab9');
    addMilotic('CP_PERU','#ffcd853f');
    addMilotic('CP_PINK','#ffffc0cb');
    addMilotic('CP_PLUM','#ffdda0dd');
    addMilotic('CP_POWDER_BLUE','#ffb0e0e6');
    addMilotic('CP_PURPLE','#ff800080');
    addMilotic('CP_RED','#ffff0000');
    addMilotic('CP_ROSY_BROWN','#ffbc8f8f');
    addMilotic('CP_ROYAL_BLUE','#ff4169e1');
    addMilotic('CP_SADDLE_BROWN','#ff8b4513');
    addMilotic('CP_SALMON','#fffa8072');
    addMilotic('CP_SANDY_BROWN','#fff4a460');
    addMilotic('CP_SEA_GREEN','#ff2e8b57');
    addMilotic('CP_SEA_SHELL','#fffff5ee');
    addMilotic('CP_SIENNA','#ffa0522d');
    addMilotic('CP_SILVER','#ffc0c0c0');
    addMilotic('CP_SKY_BLUE','#ff87ceeb');
    addMilotic('CP_SLATE_BLUE','#ff6a5acd');
    addMilotic('CP_SLATE_GRAY','#ff708090');
    addMilotic('CP_SNOW','#fffffafa');
    addMilotic('CP_SPRING_GREEN','#ff00ff7f');
    addMilotic('CP_STEEL_BLUE','#ff4682b4');
    addMilotic('CP_TAN','#ffd2b48c');
    addMilotic('CP_TEAL','#ff008080');
    addMilotic('CP_THISTLE','#ffd8bfd8');
    addMilotic('CP_TOMATO','#ffff6347');
    addMilotic('CP_TURQUOISE','#ff40e0d0');
    addMilotic('CP_VIOLET','#ffee82ee');
    addMilotic('CP_WHEAT','#fff5deb3');
    addMilotic('CP_WHITE','#ffffffff');
    addMilotic('CP_WHITE_SMOKE','#fff5f5f5');
    addMilotic('CP_YELLOW','#ffffff00');
    addMilotic('CP_YELLOW_GREEN','#ff9acd32');

  };

  var el = document.getElementsByTagName('form')[0];
  el.addEventListener('input', regenerate, false);
  el.addEventListener('change', regenerate, false);
  regenerate();
})();
