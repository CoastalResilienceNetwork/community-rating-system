// Bring in dojo and javascript api classes as well as varObject.json, js files, and content.html
define([
	"dojo/_base/declare", "framework/PluginBase", "dijit/layout/ContentPane", "dojo/dom", "dojo/dom-style", "dojo/dom-geometry", "dojo/text!./obj.json", 
	"dojo/text!./html/content.html", './js/esriapi', './js/clicks', './js/future', './js/parcels', 'dojo/_base/lang'	
],
function ( 	declare, PluginBase, ContentPane, dom, domStyle, domGeom, obj, content, esriapi, clicks, future, parcels, lang ) {
	return declare(PluginBase, {
		// The height and width are set here when an infographic is defined. When the user click Continue it rebuilds the app window with whatever you put in.
		toolbarName: "Community Rating System", showServiceLayersInLegend: true, allowIdentifyWhenActive: false, rendered: false, resizable: false,
		hasCustomPrint: false, size:'custom', width:430, hasHelp:false,
		
		// First function called when the user clicks the pluging icon. 
		initialize: function (frameworkParameters) {
			// Access framework parameters
			declare.safeMixin(this, frameworkParameters);
			// Define object to access global variables from JSON object. Only add variables to varObject.json that are needed by Save and Share. 
			this.obj = dojo.eval("[" + obj + "]")[0];	
			this.url = "http://services.coastalresilience.org:6080/arcgis/rest/services/North_Carolina/CRS/MapServer";
			this.layerDefs = [];
		},
		// Called after initialize at plugin startup (why the tests for undefined). Also called after deactivate when user closes app by clicking X. 
		hibernate: function () {
			this.map.__proto__._params.maxZoom = 23;
			if (this.appDiv != undefined){
				this.dynamicLayer.setVisibleLayers([-1])
				this.dynamicLayer1.setVisibleLayers([-1])
			}
			this.open = "no";
		},
		// Called after hibernate at app startup. Calls the render function which builds the plugins elements and functions.   
		activate: function (showHelpOnStart) {
			$('.sidebar-nav .nav-title').css("margin-left", "25px");
			this.map.__proto__._params.maxZoom = 19;
			if (this.rendered == false) {	
				this.rendered = true;							
				this.render();
				$(this.printButton).hide();
			}else{
				if (this.dynamicLayer){
					this.dynamicLayer.setVisibleLayers(this.obj.visibleLayers);
					this.dynamicLayer1.setVisibleLayers(this.obj.visibleLayers1);
				}
				$('#' + this.id).parent().parent().css('display', 'flex');
			}
			this.open = "yes";
		},
		showHelp: function(h){

		},
		// Called when user hits the minimize '_' icon on the pluging. Also called before hibernate when users closes app by clicking 'X'.
		deactivate: function () {
			this.open = "no";	
			$('.sidebar-nav .nav-title').css("margin-left", "0px");
		},	
		// Called when user hits 'Save and Share' button. This creates the url that builds the app at a given state using JSON. 
		// Write anything to you varObject.json file you have tracked during user activity.		
		getState: function () {
			// remove this conditional statement when minimize is added
			if ( $('#' + this.id ).is(":visible") ){
				//extent
				this.obj.extent = this.map.geographicExtent;
				this.obj.stateSet = "yes";	
				var state = new Object();
				state = this.obj;
				return state;	
			}
		},
		// Called before activate only when plugin is started from a getState url. 
		//It's overwrites the default JSON definfed in initialize with the saved stae JSON.
		setState: function (state) {
			this.obj = state;
		},
		// Called when the user hits the print icon
		beforePrint: function(printDeferred, $printArea, mapObject) {
			printDeferred.resolve();
		},	
		// Called by activate and builds the plugins elements and functions
		render: function() {
			this.mapScale  = this.map.getScale();
			// BRING IN OTHER JS FILES
			this.esriapi = new esriapi();
			this.clicks = new clicks();
			this.future = new future();
			this.parcels = new parcels();
			// ADD HTML TO APP
			$(this.container).parent().append('<button id="viewCrsInfoGraphicIcon" class="button button-default ig-icon"><img src="plugins/community-rating-system/images/InfographicIcon_v1_23x23.png" alt="show overview graphic"></button>')
			$(this.container).parent().find("#viewCrsInfoGraphicIcon").on('click',function(c){
				TINY.box.show({
					animate: true,
					url: 'plugins/community-rating-system/html/info-graphic.html',
					fixed: true,
					width: 660,
					height: 570
				});
			})
			// Define Content Pane as HTML parent		
			this.appDiv = new ContentPane({style:'padding:0; min-height:500px;}'});
			this.id = this.appDiv.id
			dom.byId(this.container).appendChild(this.appDiv.domNode);		
			// Get html from content.html, prepend appDiv.id to html element id's, and add to appDiv
			var idUpdate0 = content.replace(/for="/g, 'for="' + this.id);	
			var idUpdate = idUpdate0.replace(/id="/g, 'id="' + this.id);
			$('#' + this.id).html(idUpdate);
			// Set up app and listeners
			this.clicks.appSetup(this);
			this.clicks.eventListeners(this);
			this.future.eventListeners(this);
			this.parcels.eventListeners(this);
			// Create ESRI objects and event listeners	
			this.esriapi.esriApiFunctions(this);
			this.esriapi.featureLayerListeners(this);
			this.future.featureLayerListeners(this);
			this.rendered = true;	
			$("#viewCrsInfoGraphicIcon").animate({backgroundColor:"rgba(243,243,21,0.3)"}, 1050, function(){
				$("#viewCrsInfoGraphicIcon").animate({backgroundColor:"#ffffff"}, 1050, function(){
					$("#viewCrsInfoGraphicIcon").animate({backgroundColor:"rgba(243,243,21,0.3)"}, 1050, function(){
						$("#viewCrsInfoGraphicIcon").animate({backgroundColor:"#ffffff"}, 1000)
					});
				});
			});
		},
	});
});
