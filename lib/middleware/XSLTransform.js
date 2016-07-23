
var libxslt = require('libxslt'),
    fs = require('fs'),
    log = require('../logging');

function XSLTransform(defaults){
    this._xslTransformFile = ((defaults && defaults.xslTransformFile) ? defaults.xslTransformFile : null);
}

XSLTransform.prototype.configureOptions = function(options){
    if(options){
        if(options.xslTransformFile){
            this._xslTransformFile = options.xslTransformFile;
        }
    }
};

XSLTransform.prototype.process = function(data) {
    //data.body
    //data.requestHeaders

    if (this._xslTransformFile && this._xslTransformFile != '') {
        try {
            var stylesheet = libxslt.parse(fs.readFileSync(this._xslTransformFile, {encoding: 'utf-8'}));
            log.info("Transforming request body with " + this._xslTransformFile);
            data.body = stylesheet.apply(data.body);
        } catch (ex) {
            throw(ex);
        }
    } else {
        log.error("Unable to transform because no Transform File is set.");
    }
    return data;

};

module.exports = new XSLTransform();