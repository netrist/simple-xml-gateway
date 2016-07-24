# simple-xml-gateway
A simple gateway for routing soap and xml data. Simple XML gateway accepts requests and forwards them to an external endpoint. It returns the response it receives back to its client. You can check the incoming request is schema compliant, transform it using XSL,
read data from it and add headers to the request, or extend its processing logic with custom middleware functions. The gateway currently processes SOAP 1.1 requests as this is its initial use.

## Installing
Simple XML gateway uses modules that require the libxml and libxslt system libraries installed your server. This software should run on most linux and mac operating systems but has not been tested on Windows. Be sure your system has the following libraries installed:

* node 4.4.7 (may work on earlier versions)
* libxml2
* libxslt
* Python 2.7
* gcc
* node-gyp (npm module installed globally)

On an rpm-enabled system, you can install the above with: 

	yum install nodejs libxml2 libxslt gcc python27
	npm install -g node-gyp

Then check your versions:   
   
    node --version
    xsltproc --version
    python --version

Finally, clone this repository, navigate to the directory and run "npm install" as a privileged user. 

Start the application with "node lib/main.js".

## Configuring
The config folder contains a defalt.json file with a sample configuration for the Generic NAICS service. The first configuration tells the server which port to use (defaults to 3000). The remaining configurations are by route or combination of route and SOAP action. A route can be configured to:

1. Validate the request against a schema
2. Apply one or more "pipelines" (Transforms, Put data into headers, or apply any number of custom pipelines)
3. Define where the request is to be sent

If a route is defined by an endpoint and SOAP action, each of the four configurations above must be defined for the SOAP action.

IMPORTANT: If you add a schema to validate requests against, any schema includes must be relative to the directory that the node command is run from.

### Route Definition
The configuration file exposes the port number the server will use, then defines the routes. A route is composed of a path and either a default or a list of soap actions. The path is the endpoint on the simple xml gateway server. In the example below, the endpoint for the Generic NAICS route would be:

	http://[servername]:3000/GenericNAICS.asmx

The default and the soapAction list have the same structure, except that the soap action routes have a definition per soap action. The only reason to use the soap action list is when custom rules apply to different soap actions. If you use a default route, the SOAPAction header will be passed through. 

This is an example configuration for a default route:

	{
	  "port": 3000,
	  "routes": [{
	    "path": "GenericNAICS.asmx",
	    "default": {
	      "validate": {
	        "envelope": true,
	        "schema": true,
	        "schemaPath": "schemas/GenericNAICS/GenericNAICS.xsd"
	      },
	      "pipelines": [],
	      "pipe": {
	        "url": "http://www.webservicex.net/GenericNAICS.asmx"
	      }
	    }
	 }

In the example above, the route will validate the SOAP request--validating both the soap envelope and the body. The body is evaluated against the schema found in the schema path. This particular route does not transform the request. There are no pipelines defined (see below) and the final destination is defined in the "pipe":{"url"} object.

The configuration below is an example configuration of a route by soapActions. Note the use of a quote in the SOAPAction value is escaped by a preceeding backslash:

	{
	  "port": 3000,
	  "routes": [{
	    "path": "GenericNAICS.asmx",
	    "soapActions": [{
	      "action": "\"http://www.webservicex.net/GetNAICSByID\"",
	      "validate": {
	        "envelope": true,
	        "schema": true,
	        "schemaPath": "schemas/GenericNAICS/GenericNAICS.xsd"
	      },
	      "pipelines": [],
	      "pipe": {
	        "url": "http://www.webservicex.net/GenericNAICS.asmx"
	      }
	    }]
	  }

### Defining Pipelines
Each pipeline requires a pipeline name, a module name, and default configuration attributes. The pipeline name should be unique within the route and is up to the administrator. The module name must correspond to the name of the middleware javascript file (currently either "XSLTransform" or "SetHeaderFromXPath"). If
you use a custom middleware module, be sure the name corresponds to the javascript file in the middleware directory (see below for further details).

The third attribute each middleware requires are defaults. The defaults are different by middleware and defined in the middleware. The defaults for the two current middleware are listed below:

XSLTransform:

        {
          "pipelineName": "RemoveSoap", //your choice of names, should be unique within the route
          "moduleName": "XSLTransform", //corresponds with the name of the javascript file for this middleware
          "defaults": {
            "xslTransformFile": "schemas/gateway-transforms/removeSoap.xslt" //location of the transform relative to the application root
          }
        }

SetHeaderFromXPath:

        {
          "pipelineName": "SetTransactionId", //your choice of names, should be unique within the route
          "moduleName": "SetHeaderFromXPath", //corresponds with the name of the javascript file for this middleware
          "defaults": {
            "headerName": "transactionid", //the name of the header that will be set
            "xPath": "//ns:TransactionId", //the xpath of where this element is in the XML of the request
            "nsPrefix": "ns", //the namespace prefix
            "nsDefinition": "http://custom.namespace/transactions", //the namespace definition
            "overrideIfAlreadyPresent": false //if the header name is present, still override with the value from the request?
          }
        }


## For Developers
To extend the functionality of the gateway, create new middleware and add it to the middleware folder. All middleware must contain a configureOptions method and process method. When middleware is instantiated by the gateway, it reads the middleware configuration from the route definition and passes it to the configureOptions method. It will then call the process method and pass a data object to the middleware. The data object contains the request headers and request body.

After processing (and potentially changing headers or the request body), the middleware will return the data object. The gateway will pass the modified object to the next pipeline.

IMPORTANT: All custom middleware must be added to the middleware/index.js file using the module name and the require
directive.

## Future Features

* Validate responses
* Improved error handling when the incoming URI is not recognized or no route is found
* Allow schema includes to be relative to the primary XSD instead of the location that the node command was run
* Ability to process RESTful XML traffic
* Manage route configurations via REST interface
* Manage configuratons through a GUI

