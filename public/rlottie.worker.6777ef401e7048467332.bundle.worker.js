!function(e){var t={};function r(n){if(t[n])return t[n].exports;var i=t[n]={i:n,l:!1,exports:{}};return e[n].call(i.exports,i,i.exports,r),i.l=!0,i.exports}r.m=e,r.c=t,r.d=function(e,t,n){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)r.d(n,i,function(t){return e[t]}.bind(null,i));return n},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=0)}([function(e,t,r){"use strict";r.r(t),r.d(t,"RLottieItem",(function(){return i})),importScripts("rlottie-wasm.js");const n=self.Module;class i{constructor(e,t,r,n,i){this.reqId=e,this.width=r,this.height=n,this.fps=i,this.stringOnWasmHeap=null,this.handle=null,this.frameCount=0,this.dead=!1,this.fps=Math.max(1,Math.min(60,i||60)),this.init(t),h("loaded",this.reqId,this.frameCount,this.fps)}init(e){try{this.handle=o.Api.init(),this.stringOnWasmHeap=allocate(intArrayFromString(e),"i8",0),this.frameCount=o.Api.loadFromData(this.handle,this.stringOnWasmHeap),o.Api.resize(this.handle,this.width,this.height)}catch(e){console.error("init RLottieItem error:",e),h("error",this.reqId,e)}}render(e,t){if(!this.dead&&!(this.frameCount<e||e<0))try{o.Api.render(this.handle,e);var r=o.Api.buffer(this.handle),i=n.HEAPU8.subarray(r,r+this.width*this.height*4);t?t.set(i):t=new Uint8ClampedArray(i),h("frame",this.reqId,e,t)}catch(e){console.error("Render error:",e),this.dead=!0,h("error",this.reqId,e)}}destroy(){this.dead=!0,o.Api.destroy(this.handle)}}const o=new class{constructor(){this.Api={}}initApi(){this.Api={init:n.cwrap("lottie_init","",[]),destroy:n.cwrap("lottie_destroy","",["number"]),resize:n.cwrap("lottie_resize","",["number","number","number"]),buffer:n.cwrap("lottie_buffer","number",["number"]),render:n.cwrap("lottie_render","",["number","number"]),loadFromData:n.cwrap("lottie_load_from_data","number",["number","number"])}}init(){this.initApi(),h("ready")}};n.onRuntimeInitialized=function(){o.init()};const a={},s={loadFromData:function(e,t,r,n){try{const o=t.match(/"fr":\s*?(\d+?),/),s=+(null==o?void 0:o[1])||60;a[e]=new i(e,t,r,n,s)}catch(r){console.error("Invalid file for sticker:",t),h("error",e,r)}},destroy:function(e){a.hasOwnProperty(e)&&(a[e].destroy(),delete a[e])},renderFrame:function(e,t,r){a[e].render(t,r)}};let u=null;function d(e){if(null===u){const t=e.navigator?e.navigator.userAgent:null;u=!!e.safari||!(!t||!(/\b(iPad|iPhone|iPod)\b/.test(t)||t.match("Safari")&&!t.match("Chrome")))}return u}function h(...e){if(arguments.length<1)throw new TypeError("reply - not enough arguments");e=Array.prototype.slice.call(arguments,1);if(d(self))postMessage({queryMethodListener:arguments[0],queryMethodArguments:e});else{for(var t=[],r=0;r<e.length;r++)e[r]instanceof ArrayBuffer&&t.push(e[r]),e[r].buffer&&e[r].buffer instanceof ArrayBuffer&&t.push(e[r].buffer);postMessage({queryMethodListener:arguments[0],queryMethodArguments:e},t)}}onmessage=function(e){e.data instanceof Object&&e.data.hasOwnProperty("queryMethod")&&e.data.hasOwnProperty("queryMethodArguments")?s[e.data.queryMethod].apply(self,e.data.queryMethodArguments):e.data}}]);
//# sourceMappingURL=rlottie.worker.6777ef401e7048467332.bundle.worker.js.map