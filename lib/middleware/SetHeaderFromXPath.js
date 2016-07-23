
var libxslt = require('libxslt'),
    libxmljs = libxslt.libxmljs,
    log = require('../logging');

function SetHeaderFromXPath(){};

SetHeaderFromXPath.prototype.configureOptions = function(options){
    if(options){
        if(options.headerName){
            this._headerName = options.headerName;
        }
        if(options.xPath){
            this._xPath = options.xPath;
        }
        if(options.nsPrefix){
            this._nsPrefix = options.nsPrefix;
        }
        if(options.nsDefinition){
            this._nsDefinition = options.nsDefinition;
        }
        if(options.overrideIfAlreadyPresent){
            this._overrideIfAlreadyPresent = options.overrideIfAlreadyPresent;
        }
    }
};

SetHeaderFromXPath.prototype.process = function(data){
    //data.body
    //data.requestHeaders

    //don't process if key variables are not set
    if(!this._headerName || !this._xPath){
        log.warn("Unable to set headers because one or both of Header Name or XPath are not defined!");
    }
    try {
        if (!this._overrideIfAlreadyPresent && data.requestHeaders[this._headerName] && data.requestHeaders[this._headerName] != '') {
            doParse = false;
            log.info("Header " + this._headerName + " is already set. No override will be made.");
        } else {
            log.debug("Setting header " + this._headerName + " from XPath: " + this._xPath);
            var xmlDoc = libxmljs.parseXml(data.body);

            //xpath queries
            var textval;
            if(this._nsPrefix && this._nsDefinition){
                var ns = {};
                ns[this._nsPrefix] = this._nsDefinition;
                textval = xmlDoc.get(this._xPath, ns);
            } else {
                textval = xmlDoc.get(this._xPath);
            }

            if(textval && textval != ''){
                log.debug("Setting header " + this._headerName + " to " + textval.text());
                data.requestHeaders[this._headerName] = textval.text();
            }
        }

    } catch (ex) {
        throw(ex);
    }
    return data;

};

module.exports = new SetHeaderFromXPath();