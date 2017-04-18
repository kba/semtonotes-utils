/**
 * ### CoordUtils
 *
 */
module.exports =  {

    /**
     * #### `angleFromMatrix(m00, m01)`
     *
     * Calculate the angle between two matrices.
     *
     */
    angleFromMatrix(m00, m01) {
        var deg=Math.atan2(m01*-1, m00)*180/Math.PI;
        if(deg<0) { deg+=360; }
        return Math.round(deg);
    },

    /**
     * #### `coordIIIF(polygons, imgwidth, imgheight)`
     *
     * TODO
     *
     */
    coordIIIF(polygons,imgwidth,imgheight) {
        var maxx = 0;
        var minx = imgwidth;
        var maxy = 0;
        var miny = imgheight;

        var i;
        var j;

        if (Array.isArray(polygons)) {
            for (i = 0; i < polygons.length; i++) {
                if (Array.isArray(polygons[i])) {
                    for (j = 0; j < polygons[i].length; j++) {
                        if (polygons[i][j][0] > maxx) {maxx = polygons[i][j][0]}
                        if (polygons[i][j][0] < minx) {minx = polygons[i][j][0]}
                        if (polygons[i][j][1] > maxy) {maxy = polygons[i][j][1]}
                        if (polygons[i][j][1] < miny) {miny = polygons[i][j][1]}
                    }
                }
            }
        }
        minx *= imgwidth/1000;
        maxx *= imgwidth/1000;
        miny *= imgwidth/1000;
        maxy *= imgwidth/1000;
        var difx = maxx-minx;
        var dify = maxy-miny;
        return parseInt(minx)+','+parseInt(miny)+','+Math.round(difx)+','+Math.round(dify);
    },

    /**
     * #### `abs2rel(coords, absval)`
     *
     * `coords` is a list of float tuples. Multiply every float with 1000 and divide by `absval`
     */
    abs2rel (coords, absval) {
        var i;
        var polygonrel = [];
        if (Array.isArray(coords) && absval > 0) {
            for (i = 0; i < coords.length; i++) {
                var p = coords[i];
                var px = p[0] * 1000 / absval;
                var py = p[1] * 1000 / absval;
                polygonrel.push([px,py]);
            }
        }
        return polygonrel;
    },

    /**
     * #### `rel2abs(coords, val)`
     *
     * `coords` is a list of float tuples. Multiply every float with `val` and divide by 1000
     */
    rel2abs (coords,absval) {
        var i;
        var polygonabs = [];
        if (Array.isArray(coords) && absval > 0) {
            for (i = 0; i < coords.length; i++) {
                var p = coords[i];
                var px = Math.round(p[0] * absval / 1000);
                var py = Math.round(p[1] * absval / 1000);
                polygonabs.push([px,py]);
            }
        }
        return polygonabs;
    },

    /**
     * #### `isRectangle(c)`
     *
     * Determine whether an array of coordinates is a rectangle.
     */
    isRectangle(c) {
        if (!Array.isArray(c) || c.length !== 4)
            return false
        var xcoords = {};
        var ycoords = {};
        var i;
        var oldx = 0;
        var oldy = 0;
        for (i = 0; i < c.length; i++) {
            if (xcoords[c[i][0]]) {xcoords[c[i][0]]++}
            else {xcoords[c[i][0]]=1}
            if (ycoords[c[i][1]]) {ycoords[c[i][1]]++}
            else {ycoords[c[i][1]]=1}
            if (i > 0) {
                if (c[i][0] != oldx && c[i][1] != oldy) {return false}
            }
            oldx = c[i][0];
            oldy = c[i][1];
        }
        var size = 0, key;
        for (key in xcoords) {
            if (xcoords.hasOwnProperty(key)) {
                size++;
                if (xcoords[key] != 2) {return false}
            }
        }
        if (size != 2) {return false}
        size = 0;
        for (key in ycoords) {
            if (ycoords.hasOwnProperty(key)) {
                size++;
                if (ycoords[key] != 2) {return false}
            }
        }
        if (size != 2) {return false}
        return true;
    },
}
