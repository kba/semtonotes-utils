const xrx = require('semtonotes-client')
const goog = (window && window.goog) ? window.goog : xrx.goog
const CoordUtils = require('./coord-utils')

function propToGetter(prop) { return 'get' + prop.substr(0,1).toUpperCase() + prop.substr(1) }
function propToSetter(prop) { return 'set' + prop.substr(0,1).toUpperCase() + prop.substr(1) }

/**
 * ### XrxUtils
 *
 */
module.exports = class XrxUtils {

    /**
     * #### `applyStyle(shapes, styleDef)`
     *
     * Apply a set of styles to one or more stylable elements.
     * 
     * - `@param {Array|Shape-Like} shapes` Stylable SemToNotes elements (shapes, groups...)
     * - `@param {object} styleDef` is an object of key-value pairs which map to xrx.shape.Style
     * methods
     * 
     * ##### Example
     * 
     * ```js
     * XrxUtils.applyStyle(rect1, {fillColor: '#aa9900'})
     * ```
     *
     */
    static applyStyle(shapes, styleDef) {
        if (!Array.isArray(shapes)) shapes = [shapes]
        shapes.forEach(obj => {
            if (!obj) return
            const style = new xrx.shape.Style()
            Object.keys(styleDef).forEach(prop => {
                const val = styleDef[prop]
                try {
                    if (typeof val === 'object') {
                        // if (obj === 'hoverable') {
                            // Object.keys(val).forEach(hoverableProp => {
                                // obj.getHoverable()[propToSetter(hoverableProp)](val[hoverableProp])
                            // })
                        // } else {
                            XrxUtils.applyStyle(obj[propToGetter(prop)](), val)
                        // }
                    } else {
                        // console.log("Styling", obj, propToSetter(prop), style)
                        style[propToSetter(prop)](val)
                    }
                } catch (err) {
                    console.log("Failed for", prop, val, obj)
                    throw(err)
                }
            })
            obj.setStyle(style)
        })
    }

    /**
     * #### `createDrawing(elem, width, height)`
     *
     *
     * Create a drawing in DOMElement `elem`. Overrides goog.style.getSize with
     * width/height for non-visible elements.
     */
    static createDrawing(elem, width, height) {
        var origGetSize = goog.style.getSize;
        goog.style.getSize = function(origElem) {
            const origWH = origGetSize(origElem)
            if (elem === origElem && (origWH.width <= 0 || origWH.height <= 0))
                return {width, height}
            return origWH
        }
        const ret = new xrx.drawing.Drawing(elem)
        if (!ret.getEngine().isAvailable()) throw new Error("No Engine available :-( Much sadness")
        return ret
    }

    /**
     * #### `createShape(shapeType, image, options)`
     *
     * Options:
     * - `@param string shapeType` Shape Type, `Rectangle` or `Polygon`
     * - `@param xrx.drawing.Drawing image` the SemToNotes canvas to create the shape in
     * - `@param Object options` Options.
     *
     */
    static createShape(shapeType, image, options={}) {
        if (!(shapeType in xrx.shape))
            throw new Error(`No such shape ${shapeType}`)
        return new xrx.shape[shapeType](image)
    }

    /**
     * #### `drawFromSvg(svgString, drawing)`
     *
     * Translate `svgString`, a string containing SVG, to shapes and draw them
     * in `drawing`.
     *
     * - `@param Object options`
     * - `@param Boolean options.relative` Load shapes relative to the current drawing
     *
     */
    static drawFromSvg(svgString, drawing, options={}) {
        const group = XrxUtils.shapesFromSvg(svgString, drawing, options)
        drawing.getLayerShape().addShapes(group)
        drawing.draw()
        return group
    }

    /**
     * #### `svgFromShapes(shapes)`
     *
     * Generate SVG from a list of shapes or a shapeGroup.
     */
    static svgFromShapes(shapes=[]) {
        if (shapes instanceof xrx.shape.ShapeGroup) {
            shapes = shapes.getChildren()
        }
        if (!Array.isArray(shapes)) shapes = [shapes]
        if (shapes.length === 0)
            console.warn("Should pass at least one shape to svgFromShape or SVG will be empty")
        const svg = ['<?xml version="1.0" encoding="UTF-8" ?>']
        svg.push([
            `<svg xmlns="http://www.w3.org/2000/svg" version="1.1"`,
            `width="${shapes[0].getDrawing().getLayerBackground().getImage().getWidth()}"`,
            `height="${shapes[0].getDrawing().getLayerBackground().getImage().getHeight()}">`,
        ].join(' '))
        // console.log(shapes)
        for (let shape of shapes) {
            if (shape instanceof xrx.shape.Rect
                || (shape instanceof xrx.shape.Polygon && CoordUtils.isRectangle(shape.getCoords()))
            ) {
                const coords = shape.getCoords()
                var [minX, minY] = [Number.MAX_VALUE, Number.MAX_VALUE]
                var [maxX, maxY] = [Number.MIN_VALUE, Number.MIN_VALUE]
                for (let [x, y] of coords) {
                    ;[maxX, maxY] = [Math.max(x, maxX), Math.max(y, maxY)]
                    ;[minX, minY] = [Math.min(x, minX), Math.min(y, minY)]
                }
                svg.push(`  <rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}"/>`)
            } else if (shape instanceof xrx.shape.Polygon) {
                const coords = shape.getCoords()
                svg.push(`  <polygon points="${coords.map(xy => xy.join(',')).join(' ')}" />`)
            } else if (shape instanceof xrx.shape.Polyline) {
                const coords = shape.getCoords()
                svg.push(`  <polyline points="${coords.map(xy => xy.join(',')).join(' ')}" />`)
            } else if (shape instanceof xrx.shape.Line) {
                const coords = shape.getCoords()
                svg.push(`  <line x1="${coords[0][0]}" y1="${coords[0][1]}" x2="${coords[1][0]}" y2="${coords[1][1]}"/>`)
            } else if (shape instanceof xrx.shape.Ellipse) {
                const [cx, cy] = shape.getCenter()
                const [rx, ry] = [shape.getRadiusX(), shape.getRadiusY()]
                svg.push(`  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`)
            } else if (shape instanceof xrx.shape.Circle) {
                const [cx, cy] = shape.getCenter()
                const r = shape.getRadius()
                svg.push(`  <circle cx="${cx}" cy="${cy}" r="${r}"/>`)
            } else {
                console.error("SVG Export not implemented for", shape)
            }
        }
        svg.push("</svg>")
        return svg.join('\n')
    }

    /**
     * Create a ShapeGroup from the rect/polygon of an SVG.
     *
     * - `@param string svgString` SVG as a string
     * - `@param xrx.drawing.Drawing drawing` the drawing to create the group in
     * - `@param Object options`
     * - `@param Boolean options.relative` Load shapes relative to the current drawing
     * - `@returns xrx.shape.ShapeGroup`
     *
     */
    // TODO circle
    // TODO ellipse
    static shapesFromSvg(svgString, drawing, options={}) {
        if (window === undefined) throw new Error("shapesFromSvg must be run in a browser")
        options.relative = options.relative || false
        var parser = new window.DOMParser();
        var svg = parser.parseFromString(svgString, "image/svg+xml");

        const [svgWidth, svgHeight] = ['height', 'width'].map(attr =>
            parseInt(svg.documentElement.getAttribute(attr)))
        const relWidth = (svgWidth > 0)
            ? drawing.getLayerBackground().getImage().getWidth() / svgWidth
            : 1
        const relHeight = (svgHeight > 0)
            ? drawing.getLayerBackground().getImage().getHeight() / svgHeight
            : 1

        const shapes = []

        Array.from(svg.querySelectorAll("rect")).forEach(svgRect => {
            var xrxRect = new xrx.shape.Rect(drawing);
            var [x, y, width, height] = ['x', 'y', 'width', 'height']
                .map(attr => parseFloat(svgRect.getAttribute(attr)))
            if (options.relative) {
                [x, y, width, height] =
                    [x * relWidth, y * relHeight, width * relWidth, height * relHeight]
            }
            const coords = [
                [x,         y],
                [x + width, y],
                [x + width, y + height],
                [x,         y + height],
            ]
            xrxRect.setCoords(coords)
            shapes.push(xrxRect)
        })

        Array.from(svg.querySelectorAll("polygon")).forEach(svgPolygon => {
            const xrxPolygon = new xrx.shape.Polygon(drawing);
            var coords = svgPolygon
                .getAttribute("points").split(' ').map(point =>
                    point.split(',').map(xy => parseInt(xy)))
            if (options.relative) {
                coords = coords.map(([x,y]) => [x * relWidth, y * relHeight])
            }
            xrxPolygon.setCoords(coords)
            shapes.push(xrxPolygon)
        })

        Array.from(svg.querySelectorAll("polyline")).forEach(svgPolyline => {
            const xrxPolyline = new xrx.shape.Polyline(drawing);
            var coords = svgPolyline
                .getAttribute("points").split(' ').map(point =>
                    point.split(',').map(xy => parseInt(xy)))
            if (options.relative) {
                coords = coords.map(([x,y]) => [x * relWidth, y * relHeight])
            }
            xrxPolyline.setCoords(coords)
            shapes.push(xrxPolyline)
        })

        Array.from(svg.querySelectorAll("line")).forEach(svgLine => {
            const xrxLine = new xrx.shape.Line(drawing)
            var coords = [['x1', 'y1'], ['x2', 'y2']].map(point => [
                parseFloat(svgLine.getAttribute(point[0])),
                parseFloat(svgLine.getAttribute(point[1])),
            ])
            if (options.relative) {
                coords = coords.map(([x,y]) => [x * relWidth, y * relHeight])
            }
            xrxLine.setCoords(coords)
            shapes.push(xrxLine)
        })

        const group = new xrx.shape.ShapeGroup(drawing)
        group.addChildren(shapes);
        return group
    }

    /**
     * #### `svgFromDrawing(drawing)`
     *
     * Generate SVG from all shapes in a drawing.
     */
    static svgFromDrawing(drawing) {
        return XrxUtils.svgFromShapes(drawing.getLayerShape().getShapes())
    }

    /**
     * #### `navigationThumb(thumb, image)`
     *
     * Show the viewbox of `image` as a rectangle in `thumb`
     */
    static navigationThumb(thumb, image) {
        if (!thumb || !image) throw new Error("Call 'navigationThumb' with the xrx canvasses for the thumb and the image")

        var matrix = image.getViewbox().ctmDump();
        var trans = new goog.math.AffineTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
        var scaleX      = Math.sqrt(Math.pow(trans.getScaleX(), 2)+Math.pow(trans.getShearX(), 2));
        var scaleY      = Math.sqrt(Math.pow(trans.getScaleY(), 2)+Math.pow(trans.getShearY(), 2)); /* == scaleX, wenn keine Scherung */
        var thumbWidth  = thumb.getLayerBackground().getImage().getWidth();
        var thumbHeight = thumb.getLayerBackground().getImage().getHeight();
        var origWidth   = image.getLayerBackground().getImage().getWidth();
        var origHeight  = image.getLayerBackground().getImage().getHeight();
        var faktorX     = thumbWidth/(origWidth*scaleX);
        var faktorY     = thumbHeight/(origHeight*scaleY);

        var bildLO = [];
        trans.transform([0, 0], 0, bildLO, 0, 1);

        var ausschnittWidth = image.getCanvas().getWidth();
        var ausschnittHeight = image.getCanvas().getHeight();
        var ausschnittRect = new xrx.shape.Rect(thumb);

        var ausschnitt = [];
        var angle = CoordUtils.angleFromMatrix(matrix[0], matrix[1]);
        /* Drehung 90 Grad rechts */
        if (angle == 270) {
            ausschnitt[0] = [(0 - bildLO[1]) * faktorY,                (bildLO[0] - ausschnittWidth) * faktorX];
            ausschnitt[1] = [(ausschnittHeight - bildLO[1]) * faktorY, (bildLO[0] - ausschnittWidth) * faktorX];
            ausschnitt[2] = [(ausschnittHeight - bildLO[1]) * faktorY, bildLO[0] * faktorX];
            ausschnitt[3] = [(0 - bildLO[1]) * faktorY,                bildLO[0] * faktorX]
        }
        /*  Drehung 180 Grad   */
        else if (angle == 180) {
            ausschnitt[0] = [(bildLO[0] - ausschnittWidth) * faktorX, (bildLO[1] - ausschnittHeight) * faktorY];
            ausschnitt[1] = [(bildLO[0]) * faktorX, (bildLO[1] - ausschnittHeight) * faktorY];
            ausschnitt[2] = [(bildLO[0]) * faktorX, (bildLO[1]) * faktorY];
            ausschnitt[3] = [(bildLO[0] - ausschnittWidth) * faktorX, (bildLO[1]) * faktorY];
        }
        /*  Drehung 90 Grad links  */
        else if (angle == 90) {
            ausschnitt[0] = [(bildLO[1] - ausschnittHeight) * faktorY, (0 - bildLO[0]) * faktorX];
            ausschnitt[1] = [(bildLO[1]) * faktorY, (0 - bildLO[0]) * faktorX];
            ausschnitt[2] = [(bildLO[1]) * faktorY, (ausschnittWidth - bildLO[0]) * faktorX];
            ausschnitt[3] = [(bildLO[1] - ausschnittHeight) * faktorY, (ausschnittWidth - bildLO[0]) * faktorX]
        }
        /*  Drehung 0 Grad  */
        else {
            ausschnitt[0] = [(0 - bildLO[0]) * faktorX, (0 - bildLO[1]) * faktorY];
            ausschnitt[1] = [(ausschnittWidth - bildLO[0]) * faktorX, (0 - bildLO[1]) * faktorY];
            ausschnitt[2] = [(ausschnittWidth - bildLO[0]) * faktorX, (ausschnittHeight - bildLO[1]) * faktorY];
            ausschnitt[3] = [(0 - bildLO[0]) * faktorX, (ausschnittHeight - bildLO[1]) * faktorY];
        }

        var rect = new xrx.shape.Rect(thumb);
        rect.setCoords(ausschnitt)
        rect.setStrokeWidth(1.5);
        var color = '#A00000';
        // TODO
        if (typeof(zonecolor) == 'object' && zonecolor.length > 3) {
            color = '#'+zonecolor[0];
        }
        rect.setStrokeColor(color);
        rect.setFillColor(color);
        rect.setFillOpacity(0.15);
        var rects = [];
        rects.push(rect);
        thumb.getLayerShape().removeShapes();
        thumb.getLayerShape().addShapes(rect);
        thumb.draw();
    }

}
