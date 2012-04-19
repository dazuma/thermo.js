/*
-------------------------------------------------------------------------------

Heat map background worker.

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

  var workerId=null,width=null,height=null,values=null,radius=null;

  var runWorker = function() {
    var idx,numValues,data,max,array,length,x,y,h,i,j,val,hh,log;

    length = width*height;
    array = new Array(length);
    numValues = values.length;
    max = 1.0;
    for (idx=0; idx<numValues; ++idx) {
      data = values[idx];
      x = Math.floor(data.x || data[0]);
      y = Math.floor(data.y || data[1]);
      if (x < 0) x = 0;
      if (x >= width) x = width-1;
      if (y < 0) y = 0;
      if (y >= height) y = height-1;
      h = data.v || data[2] || 1.0;
      ilo = x-radius;
      if (ilo < 0) ilo = 0;
      ihi = x+radius;
      if (ihi > width) ihi = width;
      jlo = y-radius;
      if (jlo < 0) jlo = 0;
      jhi = y+radius;
      if (jhi > height) jhi = height;
      for (j=jlo; j<jhi; ++j) {
        for (i=ilo; i<ihi; ++i) {
          hh = (radius - Math.sqrt((x-i)*(x-i)+(y-j)*(y-j))) * h;
          if (hh > 0) {
            val = array[j*width+i];
            if (val) {
              val = val + hh;
            }
            else {
              val = hh;
            }
            array[j*width+i] = val;
            if (val > max) max = val;
          }
        }
      }
    }
    globals.postMessage({id: workerId, type: 'data', max: max, level: 0,
      width: width, height: height, array: array});
    globals.postMessage({id: workerId, type: 'finish'});
  };

  globals.onmessage = function(event) {
    var data = event.data;
    workerId = data.id;
    width = data.width;
    height = data.height;
    radius = Math.ceil(data.radius || 10);
    values = data.values;
    runWorker();
  };

})(this);
