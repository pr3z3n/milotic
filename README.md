# Project milotic

> You have on your palette all the colors in the spectrum - the same ones available to Michaelangelo and DaVinci.

>                    - Paul J. Meyer

Milotic is built to illustrate color palette.

## Compiling and Testing

Not Needed

## Using the API

Some of the included palettes have a limited number of colours, but others use a colour generation functions and can potentially create a whole spectrum of colours.

The basic two concepts in palette.js library are schemes and palettes.

A *palette* is a sequence of colours and it is represented by an array of colours encoded as “RRGGBB” strings.  Palette has a fixed size or number of colours in it.

A *scheme* is a set of colour palettes and it is represented by a function with some additional properties and methods (i.e. it can be used as an object).  In simplest cases, scheme will be used to generate a palette of desired size.
