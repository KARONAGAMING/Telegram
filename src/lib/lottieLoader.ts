/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import RLottieWorker from 'worker-loader!./rlottie/rlottie.worker';
import animationIntersector from "../components/animationIntersector";
import { MOUNT_CLASS_TO } from '../config/debug';
import EventListenerBase from "../helpers/eventListenerBase";
import mediaSizes from "../helpers/mediaSizes";
import { clamp } from '../helpers/number';
import { pause } from '../helpers/schedulers/pause';
import { isAndroid, isApple, isAppleMobile, isSafari } from "../helpers/userAgent";
import { logger, LogTypes } from "./logger";
import apiManager from "./mtproto/mtprotoworker";

let convert = (value: number) => {
	return Math.round(Math.min(Math.max(value, 0), 1) * 255);
};

type RLottiePlayerListeners = 'enterFrame' | 'ready' | 'firstFrame' | 'cached';
type RLottieOptions = {
  container: HTMLElement, 
  autoplay?: boolean, 
  animationData: string, 
  loop?: boolean, 
  width?: number,
  height?: number,
  group?: string,
  noCache?: true,
  needUpscale?: true,
  skipRatio?: number
};

export class RLottiePlayer extends EventListenerBase<{
  enterFrame: (frameNo: number) => void,
  ready: () => void,
  firstFrame: () => void,
  cached: () => void
}> {
  public static reqId = 0;

  public reqId = 0;
  public curFrame: number;
  public frameCount: number;
  public fps: number;
  public skipDelta: number;

  public worker: QueryableWorker;
  
  public width = 0;
  public height = 0;

  public el: HTMLElement;
  public canvas: HTMLCanvasElement;
  public context: CanvasRenderingContext2D;

  public paused = true;
  //public paused = false;
  public direction = 1;
  public speed = 1;
  public autoplay = true;
  public _autoplay: boolean; // ! will be used to store original value for settings.stickers.loop
  public loop = true;
  public _loop: boolean; // ! will be used to store original value for settings.stickers.loop
  public group = '';

  private frInterval: number;
  private frThen: number;
  private rafId: number;

  //private caching = false;
  //private removed = false;

  private frames: {[frameNo: string]: Uint8ClampedArray} = {};
  public imageData: ImageData;
  public clamped: Uint8ClampedArray;
  public cachingDelta = 0;

  //private playedTimes = 0;

  private currentMethod: RLottiePlayer['mainLoopForwards'] | RLottiePlayer['mainLoopBackwards'];
  private frameListener: () => void;

  constructor({el, worker, options}: {
    el: HTMLElement,
    worker: QueryableWorker,
    options: RLottieOptions
  }) {
    super(true);

    this.reqId = ++RLottiePlayer['reqId'];
    this.el = el;
    this.worker = worker;

    for(let i in options) {
      if(this.hasOwnProperty(i)) {
        // @ts-ignore
        this[i] = options[i];
      }
    }

    this._loop = this.loop;
    this._autoplay = this.autoplay;

    // * Skip ratio (30fps)
    let skipRatio: number;
    if(options.skipRatio !== undefined) skipRatio = options.skipRatio;
    else if((isAndroid || isAppleMobile || (isApple && !isSafari)) && this.width < 100 && this.height < 100) {
      skipRatio = 0.5;
    }

    this.skipDelta = skipRatio !== undefined ? 1 / skipRatio | 0 : 1;

    //options.needUpscale = true;

    // * Pixel ratio
    //const pixelRatio = window.devicePixelRatio;
    const pixelRatio = clamp(window.devicePixelRatio, 1, 2);
    if(pixelRatio > 1) {
      //this.cachingEnabled = true;//this.width < 100 && this.height < 100;
      if(options.needUpscale) {
        this.width = Math.round(this.width * pixelRatio);
        this.height = Math.round(this.height * pixelRatio);
      } else if(pixelRatio > 1) {
        if(this.width > 100 && this.height > 100) {
          if(isApple || !mediaSizes.isMobile) {
            /* this.width = Math.round(this.width * (pixelRatio - 1));
            this.height = Math.round(this.height * (pixelRatio - 1)); */
            this.width = Math.round(this.width * pixelRatio);
            this.height = Math.round(this.height * pixelRatio);
          } else if(pixelRatio > 2.5) {
            this.width = Math.round(this.width * (pixelRatio - 1.5));
            this.height = Math.round(this.height * (pixelRatio - 1.5));
          }
        } else {
          this.width = Math.round(this.width * Math.max(1.5, pixelRatio - 1.5));
          this.height = Math.round(this.height * Math.max(1.5, pixelRatio - 1.5));
        }
      }
    }

    //options.noCache = true;
    
    // * Cache frames params
    if(!options.noCache/*  && false */) {
      // проверка на размер уже после скейлинга, сделано для попапа и сайдбара, где стикеры 80х80 и 68х68, туда нужно 75%
      if(isApple && this.width > 100 && this.height > 100) {
        this.cachingDelta = 2; //2 // 50%
      } else if(this.width < 100 && this.height < 100) {
        this.cachingDelta = Infinity; // 100%
      } else {
        this.cachingDelta = 4; // 75%
      }
    }
    
    // this.cachingDelta = Infinity;
    // if(isApple) {
    //   this.cachingDelta = 0; //2 // 50%
    // }

    /* this.width *= 0.8;
    this.height *= 0.8; */
    
    //console.log("RLottiePlayer width:", this.width, this.height, options);
    this.canvas = document.createElement('canvas');
    this.canvas.classList.add('rlottie');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext('2d');

    this.clamped = new Uint8ClampedArray(this.width * this.height * 4);
    this.imageData = new ImageData(this.width, this.height);
  }

  public clearCache() {
    this.frames = {};
  }

  public sendQuery(methodName: string, ...args: any[]) {
    //console.trace('RLottie sendQuery:', methodName);
    this.worker.sendQuery(methodName, this.reqId, ...args);
  }

  public loadFromData(jsonString: string) {
    this.sendQuery('loadFromData', jsonString, this.width, this.height/* , this.canvas.transferControlToOffscreen() */);
  }

  public play() {
    if(!this.paused) return;

    //return;

    //console.log('RLOTTIE PLAY' + this.reqId);

    this.paused = false;
    this.setMainLoop();
  }

  public pause(clearPendingRAF = true) {
    if(this.paused) return;

    this.paused = true;
    if(clearPendingRAF) {
      clearTimeout(this.rafId);
    }
    //window.cancelAnimationFrame(this.rafId);
  }

  public stop(renderFirstFrame = true) {
    this.pause();

    this.curFrame = this.direction === 1 ? 0 : this.frameCount;
    if(renderFirstFrame) {
      this.requestFrame(this.curFrame);
      //this.sendQuery('renderFrame', this.curFrame);
    }
  }

  public restart() {
    this.stop(false);
    this.play();
  }

  public setSpeed(speed: number) {
    this.speed = speed;

    if(!this.paused) {
      this.setMainLoop();
    }
  }

  public setDirection(direction: number) {
    this.direction = direction;
    
    if(!this.paused) {
      this.setMainLoop();
    }
  }

  public remove() {
    //alert('remove');
    lottieLoader.onDestroy(this.reqId);
    this.pause();
    this.sendQuery('destroy');
    //this.removed = true;
  }

  public renderFrame2(frame: Uint8ClampedArray, frameNo: number) {
    /* this.setListenerResult('enterFrame', frameNo);
    return; */

    try {
      this.imageData.data.set(frame);
      
      //this.context.putImageData(new ImageData(frame, this.width, this.height), 0, 0);
      //let perf = performance.now();
      this.context.putImageData(this.imageData, 0, 0);
      //console.log('renderFrame2 perf:', performance.now() - perf);
    } catch(err) {
      console.error('RLottiePlayer renderFrame error:', err/* , frame */, this.width, this.height);
      this.autoplay = false;
      this.pause();
      return;
    }
    
    //console.log('set result enterFrame', frameNo);
    this.dispatchEvent('enterFrame', frameNo);
  }

  public renderFrame(frame: Uint8ClampedArray, frameNo: number) {
    //console.log('renderFrame', frameNo, this);
    if(this.cachingDelta && (frameNo % this.cachingDelta || !frameNo) && !this.frames[frameNo]) {
      this.frames[frameNo] = new Uint8ClampedArray(frame);//frame;
    }

    /* if(!this.listenerResults.hasOwnProperty('cached')) {
      this.setListenerResult('enterFrame', frameNo);
      if(frameNo === (this.frameCount - 1)) {
        this.setListenerResult('cached');
      }

      return;
    } */

    if(this.frInterval) {
      const now = Date.now(), delta = now - this.frThen;
      //console.log(`renderFrame delta${this.reqId}:`, this, delta, this.frInterval);

      if(delta < 0) {
        if(this.rafId) clearTimeout(this.rafId);
        return this.rafId = window.setTimeout(() => {
          this.renderFrame2(frame, frameNo);
        }, this.frInterval > -delta ? -delta % this.frInterval : this.frInterval);
        //await new Promise((resolve) => setTimeout(resolve, -delta % this.frInterval));
      }
    }

    this.renderFrame2(frame, frameNo);
  }

  public requestFrame(frameNo: number) {
    if(this.frames[frameNo]) {
      this.renderFrame(this.frames[frameNo], frameNo);
    } else if(isSafari) {
      this.sendQuery('renderFrame', frameNo);
    } else {
      if(!this.clamped.length) { // fix detached
        this.clamped = new Uint8ClampedArray(this.width * this.height * 4);
      }
      
      this.sendQuery('renderFrame', frameNo, this.clamped);
    }
  }

  private mainLoopForwards() {
    const frame = (this.curFrame + this.skipDelta) >= this.frameCount ? this.curFrame = 0 : this.curFrame += this.skipDelta;
    //console.log('mainLoopForwards', this.curFrame, this.skipDelta, frame);

    this.requestFrame(frame);
    if((frame + this.skipDelta) >= this.frameCount) {
      //this.playedTimes++;

      if(!this.loop) {
        this.pause(false);
        return false;
      }
    }

    return true;
  }
  
  private mainLoopBackwards() {
    const frame = (this.curFrame - this.skipDelta) < 0 ? this.curFrame = this.frameCount - 1 : this.curFrame -= this.skipDelta;
    //console.log('mainLoopBackwards', this.curFrame, this.skipDelta, frame);

    this.requestFrame(frame);
    if((frame - this.skipDelta) < 0) {
      //this.playedTimes++;

      if(!this.loop) {
        this.pause(false);
        return false;
      }
    }

    return true;
  }

  public setMainLoop() {
    //window.cancelAnimationFrame(this.rafId);
    clearTimeout(this.rafId);

    this.frInterval = 1000 / this.fps / this.speed * this.skipDelta;
    this.frThen = Date.now() - this.frInterval;

    //console.trace('setMainLoop', this.frInterval, this.direction, this, JSON.stringify(this.listenerResults), this.listenerResults);

    const method = (this.direction === 1 ? this.mainLoopForwards : this.mainLoopBackwards).bind(this);
    this.currentMethod = method;
    //this.frameListener && this.removeListener('enterFrame', this.frameListener);

    //setTimeout(() => {
      //this.addListener('enterFrame', this.frameListener);
    //}, 0);

    if(this.frameListener && this.listenerResults.hasOwnProperty('enterFrame')) {
      this.frameListener();
    }
  
    //this.mainLoop(method);
    //this.r(method);
    //method();
  }

  public async onLoad(frameCount: number, fps: number) {
    this.curFrame = this.direction === 1 ? 0 : frameCount - 1;
    this.frameCount = frameCount;
    this.fps = fps;

    // * Handle 30fps stickers if 30fps set
    if(this.fps < 60 && this.skipDelta !== 1) {
      const diff = 60 / fps;
      this.skipDelta = this.skipDelta / diff | 0;
    }

    this.frInterval = 1000 / this.fps / this.speed * this.skipDelta;
    this.frThen = Date.now() - this.frInterval;
    //this.sendQuery('renderFrame', 0);
    
    // Кешировать сразу не получится, рендер стикера (тайгер) занимает 519мс, 
    // если рендерить 75% с получением каждого кадра из воркера, будет 475мс, т.е. при 100% было бы 593мс, потеря на передаче 84мс. 

    /* console.time('cache' + this.reqId);
    for(let i = 0; i < frameCount; ++i) {
      //if(this.removed) return;
      
      if(i % 4) {
        await new Promise((resolve) => {
          delete this.listenerResults.enterFrame;
          this.addListener('enterFrame', resolve, true);
          this.requestFrame(i);
        });  
      }
    }
    
    console.timeEnd('cache' + this.reqId); */
    //console.log('cached');
    /* this.el.innerHTML = '';
    this.el.append(this.canvas);
    return; */

    this.requestFrame(0);
    this.dispatchEvent('ready');
    this.addEventListener('enterFrame', () => {
      this.dispatchEvent('firstFrame');

      this.el.appendChild(this.canvas);

      //console.log('enterFrame firstFrame');
 
      //let lastTime = this.frThen;
      this.frameListener = () => {
        if(this.paused) {
          return;
        }

        const time = Date.now();
        //console.log(`enterFrame handle${this.reqId}`, time, (time - lastTime), this.frInterval);
        /* if(Math.round(time - lastTime + this.frInterval * 0.25) < Math.round(this.frInterval)) {
          return;
        } */

        //lastTime = time;

        this.frThen = time + this.frInterval;
        const canContinue = this.currentMethod();
        if(!canContinue && !this.loop && this.autoplay) {
          this.autoplay = false;
        }
      };

      this.addEventListener('enterFrame', this.frameListener);
    }, {once: true});
  }
}

class QueryableWorker extends EventListenerBase<any> {
  constructor(private worker: Worker, private defaultListener: (data: any) => void = () => {}, onError?: (error: any) => void) {
    super();

    if(onError) {
      this.worker.onerror = onError;
    }

    this.worker.onmessage = (event) => {
      //return;
      //console.log('worker onmessage', event.data);
      if(event.data instanceof Object &&
        event.data.hasOwnProperty('queryMethodListener') &&
        event.data.hasOwnProperty('queryMethodArguments')) {
        /* if(event.data.queryMethodListener === 'frame') {
          return;
        } */

        this.dispatchEvent(event.data.queryMethodListener, ...event.data.queryMethodArguments);
      } else {
        this.defaultListener.call(this, event.data);
      }
    };
  }

  public postMessage(message: any) {
    this.worker.postMessage(message);
  }

  public terminate() {
    this.worker.terminate();
  }

  public sendQuery(queryMethod: string, ...args: any[]) {
    if(isSafari) {
      this.worker.postMessage({
        'queryMethod': queryMethod,
        'queryMethodArguments': args
      });
    } else {
      //const transfer: (ArrayBuffer | OffscreenCanvas)[] = [];
      const transfer: ArrayBuffer[] = [];
      args.forEach(arg => {
        if(arg instanceof ArrayBuffer) {
          transfer.push(arg);
        }
  
        if(arg.buffer && arg.buffer instanceof ArrayBuffer) {
          transfer.push(arg.buffer);
        }
      });
  
      //console.log('transfer', transfer);
      this.worker.postMessage({
        'queryMethod': queryMethod,
        'queryMethodArguments': args
      }, transfer as PostMessageOptions);
    }
  }
}

type LottieShape = {
  c: {
    k: number[]
  },
  ty: 'st' | 'fl',
  it?: LottieShape[]
};
class LottieLoader {
  public isWebAssemblySupported = typeof(WebAssembly) !== 'undefined';
  public loadPromise: Promise<void> = !this.isWebAssemblySupported ? Promise.reject() : undefined;
  public loaded = false;

  // https://github.com/telegramdesktop/tdesktop/blob/97d8ee75d51874fcb74a9bfadc79f835c82be54a/Telegram/SourceFiles/chat_helpers/stickers_emoji_pack.cpp#L46
  private static COLORREPLACEMENTS = [
    [
      [0xf77e41, 0xcb7b55],
			[0xffb139, 0xf6b689],
			[0xffd140, 0xffcda7],
			[0xffdf79, 0xffdfc5],
    ],

    [
      [0xf77e41, 0xa45a38],
			[0xffb139, 0xdf986b],
			[0xffd140, 0xedb183],
			[0xffdf79, 0xf4c3a0],
    ],

    [
      [0xf77e41, 0x703a17],
			[0xffb139, 0xab673d],
			[0xffd140, 0xc37f4e],
			[0xffdf79, 0xd89667],
    ],

    [
      [0xf77e41, 0x4a2409],
			[0xffb139, 0x7d3e0e],
			[0xffd140, 0x965529],
			[0xffdf79, 0xa96337],
    ],

    [
			[0xf77e41, 0x200f0a],
			[0xffb139, 0x412924],
			[0xffd140, 0x593d37],
			[0xffdf79, 0x63453f],
    ]
  ];

  private workersLimit = 4;
  private players: {[reqId: number]: RLottiePlayer} = {};

  private workers: QueryableWorker[] = [];
  private curWorkerNum = 0;

  private log = logger('LOTTIE', LogTypes.Error);

  public getAnimation(element: HTMLElement) {
    for(const i in this.players) {
      if(this.players[i].el === element) {
        return this.players[i];
      }
    }

    return null;
  }

  public setLoop(loop: boolean) {
    for(const i in this.players) {
      const player = this.players[i];
      player.loop = loop;
      player.autoplay = player._autoplay;
    }
  }

  public loadLottieWorkers() {
    if(this.loadPromise) {
      return this.loadPromise;
    }

    return this.loadPromise = new Promise((resolve, reject) => {
      let remain = this.workersLimit;
      for(let i = 0; i < this.workersLimit; ++i) {
        const worker = this.workers[i] = new QueryableWorker(new RLottieWorker());

        worker.addEventListener('ready', () => {
          this.log('worker #' + i + ' ready');

          worker.addEventListener('frame', this.onFrame);
          worker.addEventListener('loaded', this.onPlayerLoaded);
          worker.addEventListener('error', this.onPlayerError);

          --remain;
          if(!remain) {
            this.log('workers ready');
            resolve();
            this.loaded = true;
          }
        }, {once: true});
      }
    });
  }

  private applyReplacements(object: {
    layers: Array<{shapes: LottieShape[]}>
  }, toneIndex: number) {
    const replacements = LottieLoader.COLORREPLACEMENTS[Math.max(toneIndex - 1, 0)];

    const applyTo = (smth: LottieShape) => {
      const k = smth.c.k;
      const color = convert(k[2]) | (convert(k[1]) << 8) | (convert(k[0]) << 16);

      const foundReplacement = replacements.find(p => p[0] === color);
      if(foundReplacement) {
        k[0] = ((foundReplacement[1] >> 16) & 255) / 255;
        k[1] = ((foundReplacement[1] >> 8) & 255) / 255;
        k[2] = (foundReplacement[1] & 255) / 255;
      }

      //console.log('foundReplacement!', foundReplacement, color.toString(16), k);
    };

    const checkSmth = (smth: LottieShape) => {
      switch(smth.ty) {
        case 'st':
        case 'fl':
          applyTo(smth);
          break;
      }

      if(smth.hasOwnProperty('it')) {
        iterateIt(smth.it);
      }
    };

    const iterateIt = (it: LottieShape['it']) => {
      for(const smth of it) {
        checkSmth(smth);
      }
    };

    try {
      for(const layer of object.layers) {
        if(!layer.shapes) continue;
  
        for(const shape of layer.shapes) {
          if(!shape.it) {
            checkSmth(shape);
            continue;
          }

          iterateIt(shape.it);
        }
      }
    } catch(err) {
      this.log.warn('cant apply replacements', err, object, toneIndex);
    }
  }

  public loadAnimationFromURL(params: Omit<RLottieOptions, 'animationData'>, url: string): Promise<RLottiePlayer> {
    if(!this.isWebAssemblySupported) {
      return this.loadPromise as any;
    }
    
    if(!this.loaded) {
      this.loadLottieWorkers();
    }
    
    return fetch(url)
    .then(res => res.arrayBuffer())
    .then(data => apiManager.invokeCrypto('gzipUncompress', data, true))
    /* .then(str => {
      return new Promise<string>((resolve) => setTimeout(() => resolve(str), 2e3));
    }) */
    .then(str => {
      return this.loadAnimationWorker(Object.assign(params, {animationData: str as string/* JSON.parse(str) */, needUpscale: true}));
    });
  }

  public waitForFirstFrame(player: RLottiePlayer): Promise<void> {
    return Promise.race([
      /* new Promise<void>((resolve) => {
        player.addEventListener('firstFrame', () => {
          setTimeout(() => resolve(), 1500);
        }, true);
      }) */
      new Promise<void>((resolve) => {
        player.addEventListener('firstFrame', resolve, {once: true});
      }),
      pause(2500)
    ]);
  }

  public async loadAnimationWorker(params: RLottieOptions, group = '', toneIndex = -1): Promise<RLottiePlayer> {
    if(!this.isWebAssemblySupported) {
      return this.loadPromise as any;
    }
    //params.autoplay = true;

    if(toneIndex >= 1 && toneIndex <= 5) {
      /* params.animationData = copy(params.animationData);
      this.applyReplacements(params.animationData, toneIndex); */

      const newAnimationData = JSON.parse(params.animationData);
      this.applyReplacements(newAnimationData, toneIndex);
      params.animationData = JSON.stringify(newAnimationData);
    }

    if(!this.loaded) {
      await this.loadLottieWorkers();
    }

    if(!params.width || !params.height) {
      params.width = parseInt(params.container.style.width);
      params.height = parseInt(params.container.style.height);
    }

    if(!params.width || !params.height) {
      throw new Error('No size for sticker!');
    }

    params.group = group;

    const player = this.initPlayer(params.container, params);
    animationIntersector.addAnimation(player, group);

    return player;
  }

  private onPlayerLoaded = (reqId: number, frameCount: number, fps: number) => {
    const rlPlayer = this.players[reqId];
    if(!rlPlayer) {
      this.log.warn('onPlayerLoaded on destroyed player:', reqId, frameCount);
      return;
    }

    this.log.debug('onPlayerLoaded');
    rlPlayer.onLoad(frameCount, fps);
    //rlPlayer.addListener('firstFrame', () => {
      //animationIntersector.addAnimation(player, group);
    //}, true);
  };

  private onFrame = (reqId: number, frameNo: number, frame: Uint8ClampedArray) => {
    const rlPlayer = this.players[reqId];
    if(!rlPlayer) {
      this.log.warn('onFrame on destroyed player:', reqId, frameNo);
      return;
    }

    rlPlayer.clamped = frame;
    rlPlayer.renderFrame(frame, frameNo);
  };

  private onPlayerError = (reqId: number, error: Error) => {
    const rlPlayer = this.players[reqId];
    if(rlPlayer) {
      // ! will need refactoring later, this is not the best way to remove the animation
      const animations = animationIntersector.getAnimations(rlPlayer.el);
      animations.forEach(animation => {
        animationIntersector.checkAnimation(animation, true, true);
      });
    }
  };

  public onDestroy(reqId: number) {
    delete this.players[reqId];
  }

  public destroyWorkers() {
    this.workers.forEach((worker, idx) => {
      worker.terminate();
      this.log('worker #' + idx + ' terminated');
    });

    this.log('workers destroyed');
    this.workers.length = 0;
  }

  private initPlayer(el: HTMLElement, options: RLottieOptions) {
    const rlPlayer = new RLottiePlayer({
      el, 
      worker: this.workers[this.curWorkerNum++],
      options
    });

    this.players[rlPlayer.reqId] = rlPlayer;
    if(this.curWorkerNum >= this.workers.length) {
      this.curWorkerNum = 0;
    }

    rlPlayer.loadFromData(options.animationData);

    return rlPlayer;
  }
}

const lottieLoader = new LottieLoader();
MOUNT_CLASS_TO.lottieLoader = lottieLoader;
export default lottieLoader;
