define([
	"dojo/_base/declare", "esri/tasks/query", "esri/layers/FeatureLayer" 
],
function ( declare, Query, FeatureLayer ) {
        "use strict";

        return declare(null, { 
			appSetup: function(t){
				//$(".plugin-help").hide();
				// layers in map service
				t.SelectedOSPEligibleParcel = 0;
				t.CommunityBoundary = 1;
				t.EstuarineRegulatorySetbackArea = 2;
				t.NFOSEligibleParcels = 3;
				t.OSPEligibleParcelsLandUse = 4;
				t.StaticVegetationLine = 5;
				t.ImpactAdjustedExclusionArea = 6;
				t.OSPEligibleAreas = 7;
				t.ImpactAdjustedFloodplainSFHA = 8;
				t.ThirtyyrProjectedCoastalErosionHazardArea = 9;
				t.FutureOSPParcels = 10;
				// visible layer groups from map service
				t.dlOspLayers1 = [t.CommunityBoundary, t.OSPEligibleAreas, t.ImpactAdjustedFloodplainSFHA];
				t.dlOspLayers = [t.CommunityBoundary, t.OSPEligibleAreas];
				t.transLayer = [t.ImpactAdjustedFloodplainSFHA];
				t.pinLayers = [t.CommunityBoundary, t.NFOSEligibleParcels, t.OSPEligibleParcelsLandUse];
				t.pinLayers1 = [t.CommunityBoundary, t.NFOSEligibleParcels, t.OSPEligibleParcelsLandUse, t.ImpactAdjustedFloodplainSFHA];
				t.infoid = "";
				// suppress help on startup click
				$('#' + t.id + '-shosu').on('click',function(c){
					if (c.target.checked == true){
						t.app.suppressHelpOnStartup(true);
					}else{
						t.app.suppressHelpOnStartup(false);
					}
				})					
				// Infographic section clicks
				$('#' + t.id + ' .infoIcon').on('click',function(c){
					t.infoid = c.target.id.split("-").pop();
					$("#" + t.id + "dfe4").trigger('click');
				});
			},
			eventListeners: function(t){
				// tab button listener
				$( "#" + t.id + "tabBtns input").on('click',function(c){
					t.obj.active = c.target.value;
					$.each($("#" + t.id + " .crs-sections"),function(i,v){
						if (v.id != t.id + t.obj.active){
							$("#"+ v.id).slideUp();
						}
					});
					if (t.obj.active == "showInfo"){
						$("#" + t.id + "selComReminder").slideUp();
						$("#" + t.id + t.obj.active).slideDown(400, function(){
							if (t.infoid.length > 0){
								document.getElementById(t.id + t.infoid).scrollIntoView(false)
								$("." + t.infoid).animate({backgroundColor:"#f3f315"}, 1250, function(){
									$("." + t.infoid).animate({backgroundColor:"#ffffff"}, 1250, function(){
										t.infoid = "";
									});
								});
							}
						});						
					}else{
						if (t.obj.crsSelected.length == 0){
							$("#" + t.id + "selComReminder").slideDown();	
						}
						if (t.obj.crsSelected.length > 0){
							$("#" + t.id + t.obj.active).slideDown();
							t.clicks[t.obj.active](t);
						}
					}		
				})
				$("#" + t.id + "viewInfoGraphic").on('click',function(c){
					TINY.box.show({
						animate: true,
						url: 'plugins/community-rating-system/html/info-graphic.html',
						fixed: true,
						width: 660,
						height: 570
					});		
				})
				// Click tab based on active attribute from json obj
				console.log("event listener");
				$.each($("#" + t.id + "tabBtns input"),function(i,v){
					if (v.value == t.obj.active){
						$("#" + v.id).trigger('click');
					}
				})
				// Choose Community for downloads
				$("#" + t.id + "chooseComDl").chosen({width:"240px"})
					.change(function(c){
					//	t.obj.active = $( "#" + t.id + "mainAccord").accordion( "option", "active" );
						$("#" + t.id + "selComReminder").slideUp();
						t.obj.crsSelected = c.target.value;
						t.obj.crsNoSpace = c.target.value.replace(/\s+/g, '');
						$('#' + t.id + 'printAnchorDiv').empty();
						// use selected community to query community layer 	
						var q = new Query();
						q.where = "CRS_NAME = '" + t.obj.crsSelected + "'";
						t.crsFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
						t.clicks[t.obj.active](t);
						$.each($("#" + t.id + "tabBtns input"),function(i,v){
							if (v.checked){
								$("#" + v.id).trigger('click');
							}
						})
					});
				// choose parcels by PIN
				$("#" + t.id + "ch-PIN").chosen({width:"250px"})
					.change(function(c){
						t.pinSelected = c.target.value;
						t.obj.pinSelArray.push(t.pinSelected)
						if ( t.stateSet == "no" ){
						 	var q = new Query();
						 	q.where = "CRS_NAME = '" + t.obj.crsSelected + "' AND PIN = '" + t.pinSelected + "'";
						 	t.pinFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);
						}
						$('#' + t.id + 'ch-PIN').attr("data-placeholder", "Select More Parcels");
						$("#" + t.id + "ch-PIN option[value='" + t.pinSelected + "']").remove();
						if ($('#' + t.id + 'ch-PIN option').size() == 1){
						 	$('#' + t.id + 'ch-PIN').attr("data-placeholder", "No More Parcels");
						 	$('#' + t.id + 'ch-PIN').prop( "disabled", true );
						}	
						$('#' + t.appDiv.id + 'ch-PIN').trigger("chosen:updated");
						 t.clicks.zoomSelectedClass(t)
						$('#' + t.id + 'printAnchorDiv').append(
							"<div class='pinPDFdiv zoomSelected'>" +
								t.pinSelected + ": " + 
								"<a class='pinPDFLinks' id='" + t.id + "m-" + t.pinSelected + "'>View Map</a>" +
								" | " + 
								"<a class='pinZoomLinks' id='" + t.id + "z-" + t.pinSelected + "'>Zoom</a>" +
							"</div>"
						);
						$('.pinPDFLinks').on('click',function(e){
							t.clicks.zoomSelectedClass(t, e.currentTarget.parentElement)
							var pin = e.currentTarget.id.substring(e.currentTarget.id.indexOf('-')+1)
							window.open("http://crs-maps.coastalresilience.org/" + t.obj.crsNoSpace + "_" + pin + ".pdf", "_blank");
						});	
						$('.pinZoomLinks').on('click', function(e){
							t.pinTracker = "yes"
							var pin = e.currentTarget.id.substring(e.currentTarget.id.indexOf('-')+1);
							var q = new Query();
							q.where = "CRS_NAME = '" + t.obj.crsSelected + "' AND PIN = '" + pin + "'";
							t.pinFL.selectFeatures(q,FeatureLayer.SELECTION_NEW);	
							t.clicks.zoomSelectedClass(t, e.currentTarget.parentElement)
						});
					});
				// Download link clicks
				$('#' + t.id + 'downloadDiv a').on('click', function(c){
					var f = c.target.id.split("-").pop();
					window.open("https://crs-maps.coastalresilience.org/" + t.obj.crsNoSpace + f, "_blank");
				});
				// Data download click
				$('#' + t.id + 'dlBtn').on('click',  function(){
					window.open("http://crs-maps.coastalresilience.org/" + t.obj.crsNoSpace + "_Maps.zip", "_parent");
				});	
				// Future toggle buttons
				$("#" + t.id + "futureToggle input").on('click', function(c){
					$("#" + t.id + "qpWrapper, #" + t.id + "ztpWrapper").slideUp();
					$("#" + t.id + c.target.value).slideDown();
				})
			},
			downloadData:function(t){
				$('#' + t.id + 'dlOspTop').slideUp();
				$('#' + t.id + 'dlOspWrap').slideDown();
				$('#' + t.id + 'downloadDiv p').show();
				if (t.obj.crsSelected == "Duck NC1"){
					$('#' + t.id + 'allParLink').hide();
					$('#' + t.id + 'larParLink').hide();
					$('#' + t.id + 'csvDesc').hide();
				}
				if (t.obj.crsSelected == "Manteo NC" || t.obj.crsSelected == "Hyde County NC"){
					$('#' + t.id + 'ceosLink').hide();
				}	
				// Set layer defs on layers id's in dlSspLayers array
				t.layerDefs = [];
				$.each(t.dlOspLayers1, function(i,v){
				 	t.layerDefs[v] = "CRS_NAME = '" + t.obj.crsSelected + "'"
				}); 							 
				t.dynamicLayer.setLayerDefinitions(t.layerDefs);
				t.dynamicLayer1.setLayerDefinitions(t.layerDefs);
				t.obj.visibleLayers = t.dlOspLayers;
				t.obj.visibleLayers1 = t.transLayer;
				t.dynamicLayer.setVisibleLayers(t.obj.visibleLayers);
				t.dynamicLayer1.setVisibleLayers(t.obj.visibleLayers1);
			},
			printParcels: function(t){
				$('#' + t.id + 'pinTop').slideUp();
				$('#' + t.id + 'pinWrap').slideDown();
				//$('#' + t.appDiv.id + 'ch-PIN').prop( "disabled", false );
				$('#' + t.id + 'ch-PIN').attr("data-placeholder", "Find Parcel by PIN");			
				$('#' + t.id + 'ch-PIN').trigger("chosen:updated");
				//$('#' + t.appDiv.id + 'crsNameParcel').html(t.obj.crsSelected)
				// Set layer defs on layers id's in dlSspLayers array
				t.layerDefs = [];
				$.each(t.pinLayers1, function(i,v){
					t.layerDefs[v] = "CRS_NAME = '" + t.obj.crsSelected + "'"
				}); 						 
				t.dynamicLayer.setLayerDefinitions(t.layerDefs);
				t.dynamicLayer1.setLayerDefinitions(t.layerDefs);
				t.obj.visibleLayers = [t.CommunityBoundary, t.NFOSEligibleParcels, t.OSPEligibleParcelsLandUse];
				t.obj.visibleLayers1 = t.transLayer;
				t.dynamicLayer.setVisibleLayers(t.obj.visibleLayers);
				t.dynamicLayer1.setVisibleLayers(t.obj.visibleLayers1);
				// query community to populate parcels in dropdown
				var q = new Query();
				q.returnGeometry = false;
				q.outFields = ["PIN"];
				q.where = "CRS_NAME = '" + t.obj.crsSelected + "'";
				t.pinQt.execute(q, function(evt){
			 	$('#' + t.id + 'ch-PIN').empty();
			 	$('#' + t.id + 'ch-PIN').append("<option value=''></option>");
			 	t.f = evt.features;
			 	$.each(t.f, function(i,v){
			 		var pin = v.attributes.PIN;
			 		$('#' + t.id + 'ch-PIN').append("<option value='"+pin+"'>"+pin+"</option>");
			 	});
			 	$('#' + t.id + 'ch-PIN').trigger("chosen:updated");
				// 	if ( t.stateSet == "yes" ){
				// 		var len = t.pinSelArray.length - 1
				// 		t.pinReady = "no";
				// 		$.each(t.pinSelArray, lang.hitch(t,function(i,v){
				// 			if (i == len){ 
				// 				t.pinReady = "yes" 
				// 			}
				// 			var p = "r"
				// 			$('#' + t.appDiv.id + 'ch-PIN').val(v).trigger('chosen:updated').trigger('change', p)	
				// 		}));
				// 		if (t.pinReady == "no"){
				// 			// Change stateSet to no because find parcel by PIN selected and no parcels chosen from dropdown
				// 			t.stateSet = "no";
				// 		}	
				// 	}	
				});	
			},
			exploreFuture: function(t){

			},
			showInfo: function(t){
				
			},
			updateDD: function(a, c, t){
				$('#' + t.id + c).empty();
				$('#' + t.id + c).append('<option value=""></option>')
				$.each(a, function(j,w){
					$('#' + t.id + c).append('<option value="' + w + '">' + w + '</option>')
				})
				$('#' + t.id + c).trigger("chosen:updated");	
			},
			zoomSelectedClass: function(t, e){
				var c = $('#' + t.id + 'printAnchorDiv').children()
				$.each(c, function(i,v){
					$(v).removeClass('zoomSelected');
				});
				if (e){ 
					$(e).addClass('zoomSelected') 
				}	
			}
        });
    }
);
