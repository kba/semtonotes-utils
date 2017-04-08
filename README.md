# SemToNotes Utils

<!-- BEGIN-MARKDOWN-TOC -->
* [Installation](#installation)
* [Usage](#usage)
* [API](#api)
	* [XrxUtils](#xrxutils)
		* [`applyStyle(objs, styleDef)`](#applystyleobjs-styledef)
		* [`createDrawing(elem, width, height)`](#createdrawingelem-width-height)
		* [`drawFromSvg(svgString, drawing)`](#drawfromsvgsvgstring-drawing)
		* [`svgFromShapes(shapes)`](#svgfromshapesshapes)
		* [`svgFromDrawing(drawing)`](#svgfromdrawingdrawing)
		* [`navigationThumb(thumb, image)`](#navigationthumbthumb-image)
	* [CoordUtils](#coordutils)
		* [`angleFromMatrix(m00, m01)`](#anglefrommatrixm00-m01)
		* [`coordIIIF(polygons, imgwidth, imgheight)`](#coordiiifpolygons-imgwidth-imgheight)
		* [`coordAbs2Rel(polygon, imgwidth)`](#coordabs2relpolygon-imgwidth)
		* [`coordRel2Abs(polygon, imgwidth)`](#coordrel2abspolygon-imgwidth)
		* [`isRectangle(c)`](#isrectanglec)

<!-- END-MARKDOWN-TOC -->

## Installation

```sh
npm install semtonotes-utils
```

## Usage

```js
const XrxUtils = require('semtonotes-utils')
const {CoordUtils} = XrxUtils
```

## API

<!-- BEGIN-RENDER src/xrx-utils.js -->
### XrxUtils
#### `applyStyle(objs, styleDef)`
Apply a set of styles to one or more stylable elements.
`styleDef` is an object of key-value pairs which map to xrx.shape.Style
methods
#### `createDrawing(elem, width, height)`
Create a drawing in DOMElement `elem`. Overrides goog.style.getSize with
width/height for non-visible elements.
#### `drawFromSvg(svgString, drawing)`
Translate `svgString`, a string containing SVG, to shapes and draw them
in `drawing`.
#### `svgFromShapes(shapes)`
Generate SVG from a list of shapes.
#### `svgFromDrawing(drawing)`
Generate SVG from all shapes in a drawing.
#### `navigationThumb(thumb, image)`
Show the viewbox of `image` as a rectangle in `thumb`

<!-- END-RENDER -->

<!-- BEGIN-RENDER src/coord-utils.js -->
### CoordUtils
#### `angleFromMatrix(m00, m01)`
Calculate the angle between two matrices.
#### `coordIIIF(polygons, imgwidth, imgheight)`
TODO
#### `coordAbs2Rel(polygon, imgwidth)`
TODO
#### `coordRel2Abs(polygon, imgwidth)`
TODO
#### `isRectangle(c)`
Determine whether an array of coordinates is a rectangle.

<!-- END-RENDER -->

## Authors

* Leonhard Maylein
* Jochen Barth
* [Dulip Withanage](https://github.com/withanage)
* [Konstantin Baierer](https://github.com/kba)
