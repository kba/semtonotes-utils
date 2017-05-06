const CoordUtils = require('./coord-utils')

function propToGetter(prop) { return 'get' + prop.substr(0,1).toUpperCase() + prop.substr(1) }
function propToSetter(prop) { return 'set' + prop.substr(0,1).toUpperCase() + prop.substr(1) }

/**
 * ### XrxUtils
 *
 */
module.exports = class XrxUtils {

    constructor(xrx) {
        if (!window)
            throw new Error("XrxUtils must be run in a browser")
        if (!xrx)
            throw new Error("XrxUtils requires semtonotes. Make sure window.xrx is set")
        this.xrx = xrx

        if (!window.goog && ! xrx.goog)
            throw new Error("SemToNotes requires window.goog or xrx.goog")
        this.goog = window.goog || xrx.goog
    }

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
     * xrxUtils.applyStyle(rect1, {fillColor: '#aa9900'})
     * ```
     *
     */
    applyStyle(shapes, styleDef) {
        if (!Array.isArray(shapes)) shapes = [shapes]
        shapes.forEach(obj => {
            if (!obj) return
            const style = new this.xrx.shape.Style()
            Object.keys(styleDef).forEach(prop => {
                const val = styleDef[prop]
                try {
                    if (typeof val === 'object') {
                        this.applyStyle(obj[propToGetter(prop)](), val)
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
    createDrawing(elem, width, height) {
        var origGetSize = this.goog.style.getSize;
        this.goog.style.getSize = function(origElem) {
            const origWH = origGetSize(origElem)
            if (elem === origElem && (origWH.width <= 0 || origWH.height <= 0))
                return {width, height}
            return origWH
        }
        const ret = new this.xrx.drawing.Drawing(elem)
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
    createShape(shapeType, image, options={}) {
        if (!(shapeType in this.xrx.shape))
            throw new Error(`No such shape ${shapeType}`)
        return new this.xrx.shape[shapeType](image)
    }

    /**
     * #### `drawFromSvg(svgString, drawing, options)`
     *
     * Translate `svgString`, a string containing SVG, to shapes and draw them
     * in `drawing`.
     *
     * - `@param string svgString` SVG as a string
     * - `@param xrx.drawing.Drawing drawing` the drawing to create the group in
     * - `@param Object options` All options from [shapesFromSvg](#shapesFromSvg).
     *
     */
    drawFromSvg(svgString, drawing, options={}) {
        if (!svgString) {
            console.warn("drawFromSvg: No shapes to load from empty svg!")
            return
        }
        const shapes = this.shapesFromSvg(svgString, drawing, options)
        console.log("drawFromSvg", {shapes})
        if (Array.isArray(shapes)) {
            shapes.forEach(shape => drawing.getLayerShape().addShapes(shape))
        } else {
            drawing.getLayerShape().addShapes(shapes)
        }
        drawing.draw()
        return shapes
    }

    /**
     * 
     * #### `svgFromShapes(shapes, options)`
     * 
     * Generate SVG from a list of shapes or a shapeGroup.
     * 
     * - `@param {Shape|Array<Shape>|ShapeGroup} shapes`
     * - `@param Object options`
     *   - `@param Object options.absolute` Assume SVG coordinates to be equal to image dimensions. Default: `false`
     *   - `@param Boolean options.scaleX` Fixed scale factor to scale
     *          x-coordinates by.  Calculated unless provided. Falls back to
     *          `1` if not possible (i.e. absolute coords)
     *   - `@param Boolean options.scaleY` Fixed scale factor to scale
     *          y-coordinates by. Falls back to scaleX.
     *   - `@param Boolean options.svgWidth` Provide the width of the SVG
     *          context to scale coordinates by.
     *   - `@param Boolean options.svgWidth` ditto height
     *   - `@param Boolean options.imgWidth` Override the width determined by
     *          the background image of the canvas.
     *   - `@param Boolean options.imgWidth` ditto height
     *   - `@param Boolean options.skipHeight` Whether height should not be stored in SVG
     */
    svgFromShapes(shapes=[], options={}) {

        // Handle shape inputs
        if (!Array.isArray(shapes)) shapes = [shapes]
        const expanded = []
        shapes.forEach(shape => {
            if (shape instanceof this.xrx.shape.ShapeGroup)
                shape.getChildren().forEach(c => expanded.push(c))
            else expanded.push(shape)
        })
        shapes = expanded
        if (shapes.length === 0) {
            console.warn("Should pass at least one shape to svgFromShapes or SVG will be empty")
            return '<svg></svg>'
        }
        const drawing = shapes[0].getDrawing()

        // Determine scaling
        var {
            scaleX, scaleY,
            imgWidth, imgHeight,
            svgWidth, svgHeight,
            absolute,
            skipHeight,
        } = options

        if (absolute) {
            scaleX = 1
            scaleY = 1
        } else {
            if (!scaleX) {
                if (!imgWidth) imgWidth = drawing.getLayerBackground().getImage().getWidth()
                if (!svgWidth || svgWidth <= 0) scaleX = 1
                else scaleX = imgWidth / svgWidth
            }
            if (!scaleY) {
                if (!imgHeight) imgHeight = drawing.getLayerBackground().getImage().getHeight()
                if (!svgHeight || svgHeight <= 0) {
                    scaleY = scaleX
                    skipHeight = true
                }
                else scaleY = imgHeight / svgHeight
            }
        }
        svgWidth = scaleX * imgWidth
        svgHeight = scaleY * imgHeight
        console.log("svgFromShapes", {
            scaleX, scaleY,
            imgWidth, imgHeight,
            svgWidth, svgHeight,
            absolute,
            skipHeight,
        })

        const svg = [
            '<?xml version="1.0" encoding="UTF-8" ?>',
            `<svg xmlns="http://www.w3.org/2000/svg" version="1.1"`
            + `\n  width="${svgWidth}"`
            + (skipHeight ? '' : `\n  height=${svgHeight}`)
            + '>'
        ]
        shapes.forEach(shape => {
            if (shape instanceof this.xrx.shape.Rect
                || (shape instanceof this.xrx.shape.Polygon && CoordUtils.isRectangle(shape.getCoords()))
            ) {
                const coords = shape.getCoords()
                var [minX, minY] = [Number.MAX_VALUE, Number.MAX_VALUE]
                var [maxX, maxY] = [Number.MIN_VALUE, Number.MIN_VALUE]
                for (let [x, y] of coords) {
                    ;[maxX, maxY] = [Math.max(x, maxX), Math.max(y, maxY)]
                    ;[minX, minY] = [Math.min(x, minX), Math.min(y, minY)]
                }
                svg.push(['  <rect',
                    `x="${scaleX * minX}"`,
                    `y="${scaleY * minY}"`,
                    `width="${scaleX * (maxX - minX)}"`,
                    `height="${scaleY * (maxY - minY)}"`,
                    `/>`
                ].join(' '))
            } else if (shape instanceof this.xrx.shape.Polygon
                || shape instanceof this.xrx.shape.Polyline) {
                const elem = shape instanceof this.xrx.shape.Polyline ? 'line' : 'gon'
                const coords = shape.getCoords().map(
                    ([x, y]) => [scaleX * x, scaleY * y].join(',')
                ).join(' ')
                svg.push(`  <poly${elem} points="${coords}" />`)
            } else if (shape instanceof this.xrx.shape.Line) {
                const coords = shape.getCoords()
                const [x1, y1] = [scaleX * coords[0][0], scaleY * coords[0][1]]
                const [x2, y2] = [scaleX * coords[1][0], scaleY * coords[1][1]]
                svg.push(`  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`)
            } else if (shape instanceof this.xrx.shape.Ellipse) {
                const [cx, cy] = [scaleX * shape.getCenter()[0], scaleY * shape.getCenter()[1]]
                const [rx, ry] = [scaleX * shape.getRadiusX(), scaleY * shape.getRadiusY()]
                svg.push(`  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`)
            // TODO must become an ellipse if scaleY != scaleX
            } else if (shape instanceof this.xrx.shape.Circle) {
                const [cx, cy] = [scaleX * shape.getCenter()[0], scaleY * shape.getCenter()[1]]
                const r = scaleX * shape.getRadius()
                svg.push(`  <circle cx="${cx}" cy="${cy}" r="${r}"/>`)
            } else {
                console.error("SVG Export not implemented for", shape)
            }
        })
        svg.push("</svg>")
        return svg.join('\n')
    }

    /**
     * 
     * #### `shapesFromSvg(svg, drawing, options)`
     * 
     * Create a ShapeGroup from the rect/polygon of an SVG.
     *
     * - `@param string svgString` SVG as a string
     * - `@param xrx.drawing.Drawing drawing` the drawing to create the group in
     * - `@param Object options`
     *   - `@param Boolean options.grouped` Create a new ShapeGroup with the shapes. Default `true`
     *   - `@param Boolean options.absolute` Force absolute coordinates. Default: `false`
     *   - `@param Boolean options.scaleX` Fixed scale factor to scale
     *          x-coordinates by.  Calculated unless provided. Falls back to
     *          `1` if not possible (i.e. absolute coords)
     *   - `@param Boolean options.scaleY` Fixed scale factor to scale
     *          y-coordinates by. Falls back to scaleX.
     *   - `@param Boolean options.svgWidth` Provide the width of the SVG
     *          context to scale coordinates by.
     *   - `@param Boolean options.svgWidth` ditto height
     *   - `@param Boolean options.imgWidth` Override the width determined by
     *          the background image of the canvas.
     *   - `@param Boolean options.imgWidth` ditto height
     *   - `@returns xrx.shape.ShapeGroup`
     *
     */
    shapesFromSvg(svgString, drawing, options={}) {
        if (!svgString) {
            console.warn("shapesFromSvg: No shapes to load from empty svg!")
            return options.grouped ? new this.xrx.shape.ShapeGroup(drawing) : []
        }

        options.grouped = ('grouped' in options) ? options.grouped : true

        var parser = new window.DOMParser();
        var svg = parser.parseFromString(svgString, "image/svg+xml");

        if (svg.querySelector('parsererror')) {
            throw new Error("Failed to parse SVG: " + svg.querySelector('parsererror').innerText)
        }

        var {
            scaleX, scaleY,
            imgWidth, imgHeight,
            svgWidth, svgHeight,
            absolute
        } = options

        if (absolute) {
            scaleX = 1
            scaleY = 1
        } else {
            if (!scaleX) {
                if (!svgWidth) svgWidth = svg.documentElement.getAttribute('width')
                if (!imgWidth) imgWidth = drawing.getLayerBackground().getImage().getWidth()
                scaleX = svgWidth > 0 ? imgWidth / svgWidth : 1
            }
            if (!scaleY) {
                if (!svgHeight) svgHeight = svg.documentElement.getAttribute('height')
                if (!imgHeight) imgHeight = drawing.getLayerBackground().getImage().getHeight()
                scaleY = svgHeight > 0 ? imgHeight / svgHeight : scaleX
            }
        }
        svgHeight = scaleY * imgHeight
        svgWidth = scaleX * imgWidth
        console.log("shapesFromSvg", {
            scaleX, scaleY,
            imgWidth, imgHeight,
            svgWidth, svgHeight,
            absolute,
            svgString,
            svg,
        })

        const shapes = []

        Array.from(svg.querySelectorAll("rect")).forEach(svgRect => {
            var xrxRect = new this.xrx.shape.Rect(drawing);
            const x      = scaleX  * parseFloat(svgRect.getAttribute('x'))
            const y      = scaleY * parseFloat(svgRect.getAttribute('y'))
            const width  = scaleX  * parseFloat(svgRect.getAttribute('width'))
            const height = scaleY * parseFloat(svgRect.getAttribute('height'))
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
            const xrxPolygon = new this.xrx.shape.Polygon(drawing);
            var coords = svgPolygon
                .getAttribute("points").split(' ').map(point =>
                    point.split(',').map(xy => parseInt(xy))
                ).map(([x,y]) => [x * scaleX, y * scaleY])
            xrxPolygon.setCoords(coords)
            shapes.push(xrxPolygon)
        })

        Array.from(svg.querySelectorAll("polyline")).forEach(svgPolyline => {
            const xrxPolyline = new this.xrx.shape.Polyline(drawing);
            var coords = svgPolyline
                .getAttribute("points").split(' ').map(point =>
                    point.split(',').map(xy => parseInt(xy))
                ).map(([x,y]) => [x * scaleX, y * scaleY])
            xrxPolyline.setCoords(coords)
            shapes.push(xrxPolyline)
        })

        Array.from(svg.querySelectorAll("circle")).forEach(svgCircle => {
            const xrxCircle = new this.xrx.shape.Circle(drawing)
            const c = [
                scaleX  * parseFloat(svgCircle.getAttribute('cx')),
                scaleY * parseFloat(svgCircle.getAttribute('cy')),
            ]
            // TODO
            const r = Math.min(scaleX, scaleY) *  parseFloat(svgCircle.getAttribute('r'))
            xrxCircle.setCenter(...c)
            xrxCircle.setRadius(r)
            shapes.push(xrxCircle)
        })

        Array.from(svg.querySelectorAll("ellipse")).forEach(svgEllipse => {
            const xrxEllipse = new this.xrx.shape.Ellipse(drawing)
            const c = [
                scaleX * parseFloat(svgEllipse.getAttribute('cx')),
                scaleY * parseFloat(svgEllipse.getAttribute('cy')),
            ]
            const r = [
                scaleX * parseFloat(svgEllipse.getAttribute('rx')),
                scaleY * parseFloat(svgEllipse.getAttribute('ry')),
            ]
            xrxEllipse.setCenter(...c)
            xrxEllipse.setRadiusX(r[0])
            xrxEllipse.setRadiusY(r[1])
            shapes.push(xrxEllipse)
        })

        Array.from(svg.querySelectorAll("line")).forEach(svgLine => {
            const xrxLine = new this.xrx.shape.Line(drawing)
            var coords = [['x1', 'y1'], ['x2', 'y2']].map(point => [
                scaleX * parseFloat(svgLine.getAttribute(point[0])),
                scaleY * parseFloat(svgLine.getAttribute(point[1])),
            ])
            xrxLine.setCoords(coords)
            shapes.push(xrxLine)
        })

        if (options.grouped) {
            const group = new this.xrx.shape.ShapeGroup(drawing)
            group.addChildren(shapes);
            return group
        } else {
            return shapes
        }
    }

    /**
     * #### `svgFromDrawing(drawing, options)`
     * 
     * Generate SVG from all shapes in a drawing.
     * 
     * - `@param {Shape|Array<Shape>|ShapeGroup} shapes`
     * - `@param Object options` See [`svgFromShapes`](#svgfromshapesshapes-options)
     */
    svgFromDrawing(drawing, options) {
        return this.svgFromShapes(drawing.getLayerShape().getShapes())
    }

    /**
     * #### `navigationThumb(thumb, image, style={})`
     *
     * Show the viewbox of `image` as a rectangle in `thumb`
     */
    navigationThumb(thumb, image, style={}) {
        if (!thumb || !image)
            throw new Error("Call 'navigationThumb' with the xrx canvasses for the thumb and the image")

        style = Object.assign({
            strokeColor: '#A00000',
            strokeWidth: 2,
            fillColor: '#A00000',
            fillOpacity: 0.15
        }, style)

        var matrix = image.getViewbox().ctmDump();
        var trans = new this.goog.math.AffineTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
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
        var ausschnittRect = new this.xrx.shape.Rect(thumb);

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

        var rect = new this.xrx.shape.Rect(thumb);
        rect.setCoords(ausschnitt)
        thumb.getLayerShape().removeShapes();
        thumb.getLayerShape().addShapes(rect);
        this.applyStyle(rect, style)
        thumb.draw();
    }

}
