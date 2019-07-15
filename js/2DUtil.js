;require._modules["/2DUtil.js"] = (function() { var __filename = "/2DUtil.js"; var __dirname = "/"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var require = module.require = window.require._bind(module); var exports = module.exports; 
 /* ==  Begin source for module /2DUtil.js  == */ var __module__ = function() { 
 
module.exports = {
    /* useful function */
    random : function(low, high){
        return Math.random() * (high - low) + low;
    },

    randomInt : function(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    },

    calc_dist : function(pos1, pos2) {
        return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2));
    },

    Max : function(x, y) {
        return (x > y) ? x : y;
    },

    Min : function(x, y) {
        return (x < y) ? x : y;
    },

    /* 2D operation */
    Add : function(v1, v2) {
        return [v1[0] + v2[0], v1[1] + v2[1]];
    },

    Minus : function(v1, v2) {
        return [v1[0] - v2[0], v1[1] - v2[1]];
    },

    Mul : function(v1, m) {
        return [v1[0] * m, v1[1] * m];
    },

    Div : function(v1, m) {
        return [v1[0] / m, v1[1] / m];
    },

    InPdt : function(v1, v2) { // Inner Product
        return v1[0] * v2[0] + v1[1] * v2[1];
    },

    UnVec : function(v) {
        return this.Div(v, this.calc_dist(v, [0, 0]));
    },
}
 
 }; /* ==  End source for module /2DUtil.js  == */ return module; }());;