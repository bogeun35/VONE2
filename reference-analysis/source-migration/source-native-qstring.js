/* QStringUtf8_32 static native reconstruction, no original code executed.
 * 32-byte layout: uint16 byteCount + 30 payload bytes: .ctor 0x18168e770,
 * capacity 0x1e@0x18168e7c1; capacity rejection 0x181939a90.
 * implicit conversion zeroes 32 bytes@0x18168eae6..eaf2; nonempty ctor
 * writes only count+encoded bytes@0x18168e806..e83c; empty zeros@e854.
 * Encoding.UTF8@0x1812cc600 calls SetDefaultFallbacks slot5@c682;
 * UTF8Encoding.SetDefaultFallbacks@0x1812bfc30 selects replacement when
 * _isThrowException byte+39==0. Both replacement constructors receive
 * literal U+FFFD (EF BF BD), metadata slot0x1831cb728@bfc54/bfcd6.
 * Length UTF16 GetCharCount@0x18168e91c..e93a, ToString@e9bd..e9e0.
 * typed Equals@0x18168ec40 -> byte comparator0x181939ce0, count-bounded;
 * common-prefix equality then leftByteCount-rightByteCount@939d98.
 * hash: int32 h=31*h+unsignedByte@0x18168ed10..ed22;
 * return int32((byteCount+0x899)*31+h)@ed29..ed32.
 * Scene.FindActor(QString)@0x1816a7b80 rejects empty length@7c47..7c87,
 * ContainsKey@7d07 then get_Item@7d35 then Frame.GetActor@7d43.
 * Dictionary ContainsKey calls this hash@0x180033b9b. No Scene ownership.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SourceNativeQString=api;})(globalThis,function(){
'use strict';
const SIZE=32,CAPACITY=30;
function storage(q){const b=q?.bytes;if(!Array.isArray(b)||b.length!==SIZE||Array.from(b).some(x=>!Number.isInteger(x)||x<0||x>255))throw Error('NativeQString exactly32 byte values required');const n=b[0]+b[1]*256;if(n>CAPACITY)throw Error('NativeQString corrupt byteCount outside inline30 capacity; native out-of-bounds refused');return b;}
function byteCount(q){const b=storage(q);return b[0]+b[1]*256;}
function payload(q){const b=storage(q);return b.slice(2,2+byteCount(q));}
function encode(text){if(text===null)return[];if(typeof text!=='string')throw Error('NativeQString managed string or null required');const out=[];for(let i=0;i<text.length;i++){let c=text.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const lo=text.charCodeAt(i+1);if(lo>=0xdc00&&lo<=0xdfff){c=0x10000+((c-0xd800)<<10)+(lo-0xdc00);i++;}else c=0xfffd;}else if(c>=0xdc00&&c<=0xdfff)c=0xfffd;if(c<0x80)out.push(c);else if(c<0x800)out.push(0xc0|(c>>6),0x80|(c&63));else if(c<0x10000)out.push(0xe0|(c>>12),0x80|((c>>6)&63),0x80|(c&63));else out.push(0xf0|(c>>18),0x80|((c>>12)&63),0x80|((c>>6)&63),0x80|(c&63));}return out;}
function constructInto(q,text){const b=storage(q),data=encode(text);if(data.length>CAPACITY)throw Error('NativeQString native ArgumentException: UTF8 exceeds30 bytes (no truncation)');if(data.length===0)b.fill(0);else{b[0]=data.length;b[1]=0;for(let i=0;i<data.length;i++)b[i+2]=data[i];}return q;}
function fromString(text){return constructInto({bytes:Array(SIZE).fill(0)},text);}
function fromBytes(bytes){const q={bytes:Array.from(bytes??[])};storage(q);return q;}
// Malformed raw UTF8 fallback grouping remains unresolved; do not substitute
// the browser TextDecoder's possibly different invalid-sequence policy.
function toString(q){const data=payload(q);let out='';for(let i=0;i<data.length;){const a=data[i++];let c=a,k=0,min=0;if(a<0x80){}else if(a>=0xc2&&a<=0xdf){c=a&31;k=1;min=0x80;}else if(a>=0xe0&&a<=0xef){c=a&15;k=2;min=0x800;}else if(a>=0xf0&&a<=0xf4){c=a&7;k=3;min=0x10000;}else throw Error('NativeQString malformed raw UTF8 fallback unresolved');if(i+k>data.length)throw Error('NativeQString malformed raw UTF8 fallback unresolved');for(let j=0;j<k;j++){const b=data[i++];if((b&0xc0)!==0x80)throw Error('NativeQString malformed raw UTF8 fallback unresolved');c=(c<<6)|(b&63);}if(c<min||c>0x10ffff||(c>=0xd800&&c<=0xdfff))throw Error('NativeQString malformed raw UTF8 fallback unresolved');out+=String.fromCodePoint(c);}return out;}
function length(q){return toString(q).length;}
function equals(a,b){const x=payload(a),y=payload(b);return x.length===y.length&&x.every((v,i)=>v===y[i]);}
function getHashCode(q){const data=payload(q);let h=0;for(const b of data)h=(Math.imul(h,31)+b)|0;return (Math.imul(data.length+0x899,31)+h)|0;}
function compareOrdinal(a,b,host){const x=payload(a),y=payload(b),n=Math.min(x.length,y.length);if(x.slice(0,n).every((v,i)=>v===y[i]))return x.length-y.length;if(typeof host?.compareBytes!=='function')throw Error('NativeQString exact nonzero native memory comparator result unresolved; compareBytes host required');const r=host.compareBytes(x.slice(0,n),y.slice(0,n),n);if(!Number.isInteger(r)||r<-2147483648||r>2147483647||r===0)throw Error('NativeQString native nonzero int32 comparator result required');return r;}
function isFindActorKey(q){return length(q)!==0;}
function findActor(q,host){if(!isFindActorKey(q))return null;for(const k of['containsKey','getValue','getActor'])if(typeof host?.[k]!=='function')throw Error('NativeQString Scene dictionary host required: '+k);if(!host.containsKey(q))return null;return host.getActor(host.getValue(q));}
return{SIZE,CAPACITY,fromString,fromBytes,constructInto,byteCount,payload,toString,length,equals,getHashCode,compareOrdinal,isFindActorKey,findActor,supportedTypes:[],completePhysicsFidelity:false};
});
