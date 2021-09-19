(this.webpackJsonp=this.webpackJsonp||[]).push([[20],{20:function(t,e,i){"use strict";i.r(e);var s=i(33),a=i(36),n=i(16),r=i(73),o=i(62),c=i(31),l=i(89),d=i(95),p=i(29),u=i(14),h=i(96),m=i(4),w=i(28),b=i(116),g=i(34),v=i(52);let y;const k=new o.a("page-password",!0,()=>{const t=new h.a({className:"page-password",withInputWrapper:!0,titleLangKey:"Login.Password.Title",subtitleLangKey:"Login.Password.Subtitle"}),e=Object(c.a)("btn-primary btn-color-primary"),n=new u.default.IntlElement({key:"Login.Next"});e.append(n.element);const o=new l.a({label:"LoginPassword",name:"password"});let k;y=o.input,t.inputWrapper.append(o.container,e);let P,L=()=>(k||(k=window.setInterval(L,1e4)),r.a.getState().then(t=>{P=t,P.hint?Object(g.a)(o.label,Object(b.a)(p.b.wrapEmojiText(P.hint))):o.setLabel()}));const f=t=>{if(t&&Object(m.a)(t),!y.value.length)return void y.classList.add("error");const a=Object(v.a)([y,e],!0);let c=y.value;n.update({key:"PleaseWait"});const l=Object(s.f)(e);r.a.check(c,P).then(t=>{switch(t._){case"auth.authorization":clearInterval(k),i.e(5).then(i.bind(null,18)).then(t=>{t.default.mount()}),S&&S.remove();break;default:e.removeAttribute("disabled"),n.update({key:t._}),l.remove()}}).catch(t=>{a(),o.input.classList.add("error"),t.type,n.update({key:"PASSWORD_HASH_INVALID"}),y.select(),l.remove(),L()})};Object(w.b)(e,f),y.addEventListener("keypress",(function(t){if(this.classList.remove("error"),n.update({key:"Login.Next"}),"Enter"===t.key)return f()}));const E=a.b.isMobile?100:166,S=new d.a(o,E);return t.imageDiv.append(S.container),Promise.all([S.load(),L()])},null,()=>{y.focus(),n.default.pushToState("authState",{_:"authStatePassword"})});e.default=k},73:function(t,e,i){"use strict";var s=i(27),a=i(35),n=i(30);const r=new class{getState(){return n.a.invokeApi("account.getPassword").then(t=>t)}updateSettings(t={}){return this.getState().then(e=>{let i,s;const a={password:null,new_settings:{_:"account.passwordInputSettings",hint:t.hint,email:t.email}};i=t.currentPassword?n.a.invokeCrypto("computeSRP",t.currentPassword,e,!1):Promise.resolve({_:"inputCheckPasswordEmpty"});const r=e.new_algo,o=new Uint8Array(r.salt1.length+32);return o.randomize(),o.set(r.salt1,0),r.salt1=o,s=t.newPassword?n.a.invokeCrypto("computeSRP",t.newPassword,e,!0):Promise.resolve(new Uint8Array),Promise.all([i,s]).then(t=>(a.password=t[0],a.new_settings.new_algo=r,a.new_settings.new_password_hash=t[1],n.a.invokeApi("account.updatePasswordSettings",a)))})}check(t,e,i={}){return n.a.invokeCrypto("computeSRP",t,e,!1).then(t=>n.a.invokeApi("auth.checkPassword",{password:t},i).then(t=>("auth.authorization"===t._&&(a.a.saveApiUser(t.user),n.a.setUserAuth(t.user.id)),t)))}confirmPasswordEmail(t){return n.a.invokeApi("account.confirmPasswordEmail",{code:t})}resendPasswordEmail(){return n.a.invokeApi("account.resendPasswordEmail")}cancelPasswordEmail(){return n.a.invokeApi("account.cancelPasswordEmail")}};s.a.passwordManager=r,e.a=r},89:function(t,e,i){"use strict";i.d(e,"a",(function(){return n}));var s=i(4),a=i(38);class n extends a.b{constructor(t={}){super(Object.assign({plainText:!0},t)),this.passwordVisible=!1,this.onVisibilityClick=t=>{Object(s.a)(t),this.passwordVisible=!this.passwordVisible,this.toggleVisible.classList.toggle("eye-hidden",this.passwordVisible),this.input.type=this.passwordVisible?"text":"password",this.onVisibilityClickAdditional&&this.onVisibilityClickAdditional()};const e=this.input;e.type="password",e.setAttribute("required",""),e.autocomplete="off";const i=document.createElement("input");i.classList.add("stealthy"),i.tabIndex=-1,i.type="password",e.parentElement.prepend(i),e.parentElement.insertBefore(i.cloneNode(),e.nextSibling);const a=this.toggleVisible=document.createElement("span");a.classList.add("toggle-visible","tgico"),this.container.classList.add("input-field-password"),this.container.append(a),a.addEventListener("click",this.onVisibilityClick),a.addEventListener("touchend",this.onVisibilityClick)}}},95:function(t,e,i){"use strict";i.d(e,"a",(function(){return a}));var s=i(46);class a{constructor(t,e){this.passwordInputField=t,this.size=e,this.needFrame=0,this.container=document.createElement("div"),this.container.classList.add("media-sticker-wrapper")}load(){return this.loadPromise?this.loadPromise:this.loadPromise=s.b.loadAnimationFromURL({container:this.container,loop:!1,autoplay:!1,width:this.size,height:this.size,noCache:!0},"assets/img/TwoFactorSetupMonkeyPeek.tgs").then(t=>(this.animation=t,this.animation.addEventListener("enterFrame",t=>{(1===this.animation.direction&&t>=this.needFrame||-1===this.animation.direction&&t<=this.needFrame)&&(this.animation.setSpeed(1),this.animation.pause())}),this.passwordInputField.onVisibilityClickAdditional=()=>{this.passwordInputField.passwordVisible?(this.animation.setDirection(1),this.animation.curFrame=0,this.needFrame=16,this.animation.play()):(this.animation.setDirection(-1),this.animation.curFrame=16,this.needFrame=0,this.animation.play())},s.b.waitForFirstFrame(t)))}remove(){this.animation&&this.animation.remove()}}},96:function(t,e,i){"use strict";i.d(e,"a",(function(){return a}));var s=i(14);class a{constructor(t){this.element=document.body.querySelector("."+t.className),this.container=document.createElement("div"),this.container.className="container center-align",this.imageDiv=document.createElement("div"),this.imageDiv.className="auth-image",this.title=document.createElement("h4"),t.titleLangKey&&this.title.append(Object(s.i18n)(t.titleLangKey)),this.subtitle=document.createElement("p"),this.subtitle.className="subtitle",t.subtitleLangKey&&this.subtitle.append(Object(s.i18n)(t.subtitleLangKey)),this.container.append(this.imageDiv,this.title,this.subtitle),t.withInputWrapper&&(this.inputWrapper=document.createElement("div"),this.inputWrapper.className="input-wrapper",this.container.append(this.inputWrapper)),this.element.append(this.container)}}}}]);
//# sourceMappingURL=20.7f54c19ff1ced6ccbc2d.chunk.js.map