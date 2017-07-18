define([
	"dojo/_base/declare", "esri/tasks/query", "esri/tasks/QueryTask", "esri/layers/FeatureLayer" 
],
function ( declare, Query, QueryTask, FeatureLayer ) {
        "use strict";

        return declare(null, { 
			appSetup: function(t){
				//$(".plugin-help").hide();
				// layers in map service
				t.SelectedOSPEligibleParcel = 0;
				t.SelectedFutureOSPParcel = 1;
				t.FutureOSPParcelsInQuery = 2;
				t.CommunityBoundary = 3;
				t.EstuarineRegulatorySetbackArea = 4;
				t.NFOSEligibleParcels = 5;
				t.OSPEligibleParcelsLandUse = 6;
				t.StaticVegetationLine = 7;
				t.ImpactAdjustedExclusionArea = 8;
				t.OSPEligibleAreas = 9;
				t.ImpactAdjustedFloodplainSFHA = 10;
				t.ThirtyyrProjectedCoastalErosionHazardArea = 11;
				t.FutureOSPParcels = 12;
				// visible layer groups from map service
				t.dlOspLayers1 = [t.CommunityBoundary, t.OSPEligibleAreas, t.ImpactAdjustedFloodplainSFHA];
				t.dlOspLayers = [t.CommunityBoundary, t.OSPEligibleAreas];
				t.transLayer = [t.ImpactAdjustedFloodplainSFHA];
				t.pinLayers = [t.CommunityBoundary, t.NFOSEligibleParcels, t.OSPEligibleParcelsLandUse];
				t.pinLayers1 = [t.CommunityBoundary, t.NFOSEligibleParcels, t.OSPEligibleParcelsLandUse, t.ImpactAdjustedFloodplainSFHA];
				t.infoid = "";
			},
			eventListeners: function(t){
				// show popup info graphic
				$("#" + t.id + "viewInfoGraphic").on('click',function(c){
					TINY.box.show({
						animate: true, url: 'plugins/community-rating-system/html/info-graphic.html',
						fixed: true, width: 660, height: 570
					});		
				})
				// Infographic section clicks
				$('#' + t.id + ' .infoIcon').on('click',function(c){
					t.infoid = c.target.id.split("-").pop();
					$("#" + t.id + "dfe4").trigger('click');
				});
				// tab button listener
				$( "#" + t.id + "tabBtns input").on('click',function(c){
					t.obj.active = c.target.value;
					$.each($("#" + t.id + " .crs-sections"),function(i,v){
						if (v.id != t.id + t.obj.active){
							$("#"+ v.id).slideUp();
						}
					});
					if (t.obj.active == "showInfo"){
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
						if (t.obj.crsSelected.length > 0){
							t.clicks[t.obj.active](t);
						}
					}
				})
				// Choose Community for downloads
				$("#" + t.id + "chooseComDl").chosen({width:"240px"})
					.change(function(c){
						$( "#" + t.id + "tab-wrap").show();
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
				// Download link clicks
				$('#' + t.id + 'downloadDiv a').on('click', function(c){
					var f = c.target.id.split("-").pop();
					//window.open("https://crs-maps.coastalresilience.org/" + t.obj.crsNoSpace + f, "_blank");
					window.open("https://nsttnc.blob.core.windows.net/crs/" + t.obj.crsNoSpace + f, "_blank");
				});
				// Data download click
				$('#' + t.id + 'dlBtn').on('click',  function(){
					//window.open("http://crs-maps.coastalresilience.org/" + t.obj.crsNoSpace + "_Maps.zip", "_parent");
					window.open("https://nsttnc.blob.core.windows.net/crs/" + t.obj.crsNoSpace + "_Maps.zip", "_parent");
				});	
				
			},
			downloadData:function(t){
				$("#" + t.id + t.obj.active).slideDown();
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
				$("#" + t.id + t.obj.active).slideDown();
				$('#' + t.id + 'pinTop').slideUp();
				$('#' + t.id + 'pinWrap').slideDown();
				$('#' + t.id + 'ch-PIN').attr("data-placeholder", "Find Parcel by PIN");			
				$('#' + t.id + 'ch-PIN').trigger("chosen:updated");
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
				});	
			},
			exploreFuture: function(t){
				var q = new Query();
				var qt = new QueryTask(t.url + '/' + t.FutureOSPParcels);
				q.where = "CRS_NAME = '" + t.obj.crsSelected + "'";
				qt.executeForCount(q,function(count){
					if (count > 0){
						$("#" + t.id + t.obj.active + "None").slideUp();
						$("#" + t.id + t.obj.active).slideDown();
						$.each($("#" + t.id + "futureToggle input"), function(i,v){
							if (t.obj.futureToggle == v.value){
								if ($("#" + t.id + t.obj.futureToggle).is(":hidden")){
									$("#" + v.id).trigger("click")
								}else{
									$("#" + v.id).prop("checked", true)
								}	
							}
						})
						t.layerDefs = [];
						// Set layer defs on layers id's in dlSspLayers array
						$.each(t.dlOspLayers1, function(i,v){
							t.layerDefs[v] = "CRS_NAME = '" + t.obj.crsSelected + "'"
						}); 							 
						//.this.navigation.clearFuture(t);
						t.dynamicLayer.setLayerDefinitions(t.layerDefs);
						t.dynamicLayer1.setLayerDefinitions(t.layerDefs);								
						t.obj.visibleLayers = [t.CommunityBoundary];
						t.dynamicLayer.setVisibleLayers(t.obj.visibleLayers);
						$('#' + t.id + 'curElOsp').prop('checked', t.obj.curElOsp).trigger("change");
						$('#' + t.id + 'ImpactAd').prop('checked', t.obj.ImpactAd).trigger("change");		
					}else{
						$("#" + t.id + t.obj.active).slideUp();
						$("#" + t.id + "no-future-parcels").html("No future OSP parcels in " + t.obj.crsSelected)
						$("#" + t.id + t.obj.active + "None").slideDown();
					}
				})	
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
			},
			numberWithCommas: function(x){
				return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			}
        });
    }
);
