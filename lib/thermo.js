/*
-------------------------------------------------------------------------------

Heat map.

-------------------------------------------------------------------------------
Copyright 2012 Daniel Azuma

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
  this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.
* Neither the name of the copyright holder, nor the names of any other
  contributors to this software, may be used to endorse or promote products
  derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
-------------------------------------------------------------------------------
*/


(function(globals) {

  var ns, computerProto, renderProto, googleProto;
  ns = globals.Thermo = {};


  ns.Computer = function(options) {
    var self=this;
    self._worker = null;
    self._workerId = 0;
    self._width = null;
    self._height = null;
    self._lastData = null;
    self._workerPath = '/assets/thermo-worker.js';
    self._startCallbacks = $.Callbacks();
    self._finishCallbacks = $.Callbacks();
    self._dataCallbacks = $.Callbacks();
    if (!options) options = {};
    if (options.radius) self.radius = options.radius;
    if (options.workerPath) self._workerPath = options.workerPath;
  };
  computerProto = ns.Computer.prototype;

  computerProto.stop = function() {
    var self=this;
    if (self._worker) {
      self._worker.terminate();
      self._worker = null;
      return true;
    }
    else {
      return false;
    }
  };

  computerProto.start = function(width, height, values, options) {
    var self=this,id,radius,worker;

    if (!options) options = {};
    radius = options.radius || self.radius;

    self.stop();

    self._width = width;
    self._height = height;
    self._lastData = {};
    id = self._workerId + 1;
    self._workerId = id;

    self._worker = worker = new Worker(self._workerPath);
    worker.onmessage = function(event) {
      var data = event.data;
      if (data.id == id && self._worker) {
        if (data.type == 'data') {
          self._lastData = data;
          self._dataCallbacks.fire(self, data);
        }
        else if (data.type == 'finish') {
          self._worker.terminate();
          self._worker = null;
          self._finishCallbacks.fire(self);
        }
      }
    };
    worker.onerror = function() { alert('error!'); };
    worker.postMessage({id: id, width: width, height: height, values: values, radius: radius});
    self._startCallbacks.fire(self);
    return null;
  };

  computerProto.isRunning = function() {
    var self=this;
    return self._worker != null;
  };

  computerProto.addCallback = function(name, func) {
    var self=this,callbacks;
    callbacks = self['_'+name+'Callbacks'];
    if (callbacks) {
      callbacks.add(func);
      return true;
    }
    else {
      return false;
    }
  };

  computerProto.removeCallback = function(name, func) {
    var self=this,callbacks;
    callbacks = self['_'+name+'Callbacks'];
    if (callbacks) {
      callbacks.remove(func);
      return true;
    }
    else {
      return false;
    }
  };

  computerProto.clearCallbacks = function(name) {
    var self=this,callbacks;
    callbacks = self['_'+name+'Callbacks'];
    if (callbacks) {
      self['_'+name+'Callbacks'] = $.Callbacks();
      return true;
    }
    else {
      return false;
    }
  }

  computerProto.width = function() {
    return this._width;
  };

  computerProto.height = function() {
    return this._height;
  };

  computerProto.radius = 10;


  ns.CanvasRender = function(div, computer, options) {
    var self=this;

    self._div = $(div);
    self._canvas = null;
    self._lastData = null;
    options = options || {};
    if (options.initColor) self.initColor = options.initColor;
    if (options.computeColor) self.computeColor = options.computeColor;
    self.curve = options.curve || 20;

    computer.addCallback('start', function(comp) {
      self._canvas = $('<canvas width="'+comp.width()+'" height="'+comp.height()+'" style="width:100%;height:100%;"></canvas>');
      self._div.empty().append(self._canvas);
    });
    computer.addCallback('data', function(comp, data) {
      self._lastData = data;
      self.render();
    });
  };
  renderProto = ns.CanvasRender.prototype;

  renderProto.render = function() {
    var self=this,data,canvas,ctx,step,canvasWidth,initColor,i,j,vals,color,width,height,
      max,xmax,ymax,x,y,idx,imdata,imdatadata,obj,initColor,computeColor;
    canvas = self._canvas[0];
    ctx = canvas.getContext("2d");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    data = self._lastData;
    if (data) {
      step = Math.pow(2, data.level);
      width = data.width;
      height = data.height;
      imdata = ctx.createImageData(canvasWidth, canvasHeight);
      imdatadata = imdata.data;
      initColor = self.initColor;
      computeColor = self.computeColor;
      obj = initColor(self, data);
      vals = data.array;
      for (j=0; j<height; ++j) {
        for (i=0; i<width; ++i) {
          color = computeColor(vals[j*width+i] || 0, obj);
          xmax = (i+1) * step;
          ymax = (j+1) * step;
          if (xmax > canvasWidth) xmax = canvasWidth;
          if (ymax > canvasHeight) ymax = canvasHeight;
          for (y=j*step; y<ymax; ++y) {
            for (x=i*step; x<xmax; ++x) {
              idx = (y*canvasWidth+x)*4;
              imdatadata[idx] = color[0];
              imdatadata[idx+1] = color[1];
              imdatadata[idx+2] = color[2];
              imdatadata[idx+3] = color[3];
            }
          }
        }
      }
      ctx.putImageData(imdata, 0, 0);
    }
  };

  renderProto.initColor = function(render, data) {
    var curve=render.curve;
    return {max: Math.log(data.max / curve + 1), curve: curve};
  };

  renderProto.computeColor = function(val, obj) {
    val = Math.floor(Math.log(val / obj.curve + 1) / obj.max * 767);
    if (val < 256) {
      return [0, 0, val, 160];
    }
    else if (val < 512) {
      return [val-256, 0, 511-val, 160];
    }
    else {
      return [255, val-512, 0, 160];
    }
  };


  ns.GoogleMapsOverlay = function(map, options) {
    var self=this;
    self.setMap(map);
    self._computer = new ns.Computer(options);
    self._renderOptions = options;
  }
  googleProto = ns.GoogleMapsOverlay.prototype = new google.maps.OverlayView();

  _googleMapsOverlay_updatePosition = function(self) {
    var nw,se;
    if (!self._bounds) {
      self.establishBounds();
    }
    nw = self.getProjection().fromLatLngToDivPixel(
      new google.maps.LatLng(self._bounds.n, self._bounds.w));
    se = self.getProjection().fromLatLngToDivPixel(
      new google.maps.LatLng(self._bounds.s, self._bounds.e));
    self._div.css('top', ''+Math.floor(nw.y)+'px')
      .css('left', ''+Math.floor(nw.x)+'px')
      .css('width', ''+(Math.floor(se.x-nw.x))+'px')
      .css('height', ''+(Math.floor(se.y-nw.y))+'px');
  };

  googleProto.onAdd = function() {
    var self=this,div;
    self._div = div = $('<div style="position:absolute;border:0;"></div>');
    _googleMapsOverlay_updatePosition(self);
    $(self.getPanes().overlayLayer).append(div);
    self.renderer = new ns.CanvasRender(div, self._computer, self._renderOptions);
  };

  googleProto.draw = function() {
    _googleMapsOverlay_updatePosition(this);
  };

  googleProto.establishBounds = function() {
    var self=this,bounds,sw,ne;
    bounds = self.getMap().getBounds();
    sw = bounds.getSouthWest();
    ne = bounds.getNorthEast();
    self._bounds = {n: ne.lat(), s: sw.lat(), e: ne.lng(), w: sw.lng()};
    return {n: ne.lat(), s: sw.lat(), e: ne.lng(), w: sw.lng()};
  };

  googleProto.renderDataArray = function(array) {
    var self=this,mapDiv;
    mapDiv = $(self.getMap().getDiv());
    _googleMapsOverlay_updatePosition(self);
    self._computer.start(mapDiv.width(), mapDiv.height(), array);
  };

  googleProto.renderLatLngArray = function(latlngs) {
    var self=this,projection,i,data;
    data = new Array(latlngs.length);
    projection = self.getMap().getProjection();
    for (i=latlngs.length-1; i>=0; --i) {
      data[i] = projection.fromLatLngToDivPixel(latlngs[i]);
    }
    self.renderDataArray(data);
  };


})(this);
