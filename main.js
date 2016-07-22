// Pull in your favorite version of jquery 
require({ 
	packages: [{ name: "jquery", location: "http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/", main: "jquery.min" }] 
});
// Bring in dojo and javascript api classes as well as varObject.json and content.html
define([
	"esri/layers/ArcGISDynamicMapServiceLayer", "esri/geometry/Extent", "esri/SpatialReference", "esri/tasks/query", "esri/tasks/QueryTask",
	"esri/symbols/PictureMarkerSymbol", "dijit/TooltipDialog", "dijit/popup",
	"dojo/_base/declare", "framework/PluginBase", "esri/layers/FeatureLayer", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/lang", "esri/tasks/Geoprocessor",
	"esri/symbols/SimpleMarkerSymbol", "esri/graphic", "dojo/_base/Color", 	"dijit/layout/ContentPane", "dijit/form/HorizontalSlider", "dojo/dom", 
	"dojo/dom-class", "dojo/dom-style", "dojo/dom-construct", "dojo/dom-geometry", "dojo/_base/lang", "dojo/on", "dojo/parser", 'plugins/community-rating-system/js/ConstrainedMoveable',
	"dojo/text!./varObject.json", "jquery", "dojo/text!./html/legend.html", "dojo/text!./html/content.html", 'plugins/community-rating-system/js/jquery-ui-1.11.2/jquery-ui', 
	'plugins/community-rating-system/js/navigation', 'plugins/community-rating-system/js/esriapi', 'plugins/community-rating-system/js/clicks'
],
function ( ArcGISDynamicMapServiceLayer, Extent, SpatialReference, Query, QueryTask, PictureMarkerSymbol, TooltipDialog, dijitPopup,
	declare, PluginBase, FeatureLayer, SimpleLineSymbol, SimpleFillSymbol, esriLang, Geoprocessor, SimpleMarkerSymbol, Graphic, Color,
	ContentPane, HorizontalSlider, dom, domClass, domStyle, domConstruct, domGeom, lang, on, parser, ConstrainedMoveable, config, $, 
	legendContent, content, ui, navigation, esriapi, clicks ) {
	return declare(PluginBase, {
		// The height and width are set here when an infographic is defined. When the user click Continue it rebuilds the app window with whatever you put in.
		toolbarName: "Community Rating System", showServiceLayersInLegend: true, allowIdentifyWhenActive: false, rendered: false, resizable: false,
		hasCustomPrint: true, usePrintPreviewMap: true, previewMapSize: [1000, 550], height:"216", width:"425",
		infoGraphic: "<div style='padding:5px;width:600px;text-align: justify'> <div style='font-size: 120%;'>This application helps planners identify areas that are eligible for Open Space Preservation credits in<a target='_blank' href='https://www.fema.gov/national-flood-insurance-program-community-rating-system'>FEMA’s Community Rating System</a>(CRS) and provides exportable information to support the application process.* CRS is a voluntary program that encourages a more comprehensive approach to floodplain management and provides opportunities for communities to lower their flood insurance premiums by participating in activities that reduce flood damage to insurable property.</div><div><img src='plugins/community-rating-system/images/CRS_App_20160404.jpg'/></div> <div>* The information provided by this app does not represent a final analysis or score. All findings should be verified by your CRS ISO representative. Find your CRS representative<a target='_blank' href='http://crsresources.org/100-2/'>here.</a></div></div>",
		// First function called when the user clicks the pluging icon. 
		initialize: function (frameworkParameters) {
			// Access framework parameters
			declare.safeMixin(this, frameworkParameters);
			// Set initial app size based on split screen state
			this.con = dom.byId('plugins/community-rating-system-0');
			this.con1 = dom.byId('plugins/community-rating-system-1');
			if (this.con1 != undefined){
				domStyle.set(this.con1, "width", "216px");
				domStyle.set(this.con1, "height", "370px");
			}else{
				domStyle.set(this.con, "width", "425px");
				domStyle.set(this.con, "height", "216px");
			}	
			// Define object to access global variables from JSON object. Only add variables to varObject.json that are needed by Save and Share. 
			this.config = dojo.eval("[" + config + "]")[0];	
			// Define global config not needed by Save and Share
			//this.config.url = "http://dev.services2.coastalresilience.org:6080/arcgis/rest/services/North_Carolina/NC_CRS/MapServer"

		},
		// Called after initialize at plugin startup (why all the tests for undefined). Also called after deactivate when user closes app by clicking X. 
		hibernate: function () {
			//$('.legend').removeClass("hideLegend");
			this.map.__proto__._params.maxZoom = 23;
			if (this.appDiv != undefined){
				$('#' + this.appDiv.id + 'ch-CRS').val('').trigger('chosen:updated');
				$('#' + this.appDiv.id + 'ch-CRS').trigger('change');
			}
		},
		// Called after hibernate at app startup. Calls the render function which builds the plugins elements and functions.   
		activate: function () {
			// Hide framework default legend
			//$('.legend').addClass("hideLegend");
			this.map.__proto__._params.maxZoom = 19;
			if (this.rendered == false) {
				this.rendered = true;							
				this.render();
				// Hide the print button until a hex has been selected
				$(this.printButton).hide();
				this.dynamicLayer.setVisibility(true);
			} else {
				if (this.dynamicLayer != undefined)  {
					this.dynamicLayer.setVisibility(true);	
					if ( this.map.getZoom() > 12 ){
						this.map.setLevel(12)	
					}	
				}
			}
		},
		// Called when user hits the minimize '_' icon on the pluging. Also called before hibernate when users closes app by clicking 'X'.
		deactivate: function () {
			//$('.legend').removeClass("hideLegend");
		},	
		// Called when user hits 'Save and Share' button. This creates the url that builds the app at a given state using JSON. 
		// Write anything to you varObject.json file you have tracked during user activity.		
		getState: function () {
			this.config.extent = this.map.geographicExtent;
			this.config.stateSet = "yes";
				
			var state = new Object();
			state = this.config;
			return state;
		},
		// Called before activate only when plugin is started from a getState url. 
		//It's overwrites the default JSON definfed in initialize with the saved stae JSON.
		setState: function (state) {
			this.config = state;
		},
		// Called when the user hits the print icon
		beforePrint: function(printDeferred, $printArea, mapObject) {
			printDeferred.resolve();
		},	
		// Resizes the plugin after a manual or programmatic plugin resize so the button pane on the bottom stays on the bottom.
		// Tweak the numbers subtracted in the if and else statements to alter the size if it's not looking good.
		resize: function(w, h) {
			cdg = domGeom.position(this.container);
			if (cdg.h == 0) { this.sph = this.height - 80; }
			else { this.sph = cdg.h - 62; }
			domStyle.set(this.appDiv.domNode, "height", this.sph + "px"); 
		},
		// Called by activate and builds the plugins elements and functions
		render: function() {
			// BRING IN OTHER JS FILES
			this.navigation = new navigation();
			this.esriapi = new esriapi();
			this.clicks = new clicks();
			// ADD HTML TO APP
			// Define Content Pane as HTML parent		
			this.appDiv = new ContentPane({style:'padding:8px 8px 8px 8px'});
			parser.parse();
			dom.byId(this.container).appendChild(this.appDiv.domNode);					
			// Get html from content.html, prepend appDiv.id to html element id's, and add to appDiv
			var idUpdate = content.replace(/id='/g, "id='" + this.appDiv.id);	
			$('#' + this.appDiv.id).html(idUpdate);
			// CREATE ACCORDIANS
			$('#' + this.appDiv.id + 'dlAccord').accordion({ collapsible: true, active: 0, heightStyle: "content" });
			$('#' + this.appDiv.id + 'dlAccord1').accordion({ collapsible: true, active: 0, heightStyle: "content"});
			// CALL NAVIGATION BUTTON EVENT LISTENERS 
			this.navigation.navListeners(this);
			// CREATE ESRI OBJECTS AND EVENT LISTENERS	
			this.esriapi.esriApiFunctions(this);
			// CREATE CHOSEN SELECT MENUS AND EVENT LISTENERS	
			this.clicks.chosenListeners(this);				
			// EVENT LISTENER FOR MAP PREVIEW AND DOWNLOAD
			this.clicks.mapPreviewDownload(this);	
			// EXPAND AND COLLAPSE INFO IN ELEMENTS SUMMARY
			this.clicks.toggleInfoSum(this);
				
			this.rendered = true;				
		},
		zoomSelectedClass: function(e){
			var c = $('#' + this.appDiv.id + 'printAnchorDiv').children()
			$.each(c,lang.hitch(this,function(i,v){
				$(v).removeClass('zoomSelected');
			}));
			if (e){ $(e).addClass('zoomSelected') }	
		}
	});
});	
function commaSeparateNumber(val){
    while (/(\d+)(\d{3})/.test(val.toString())){
		val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
	}
	return val;
}
function dateFinder(date){
	var month = date.getMonth() + 1;
	var day = date.getDate();
	var year = date.getFullYear();
	var d = month + "/" + day + "/" + year;
	return d;
}	
