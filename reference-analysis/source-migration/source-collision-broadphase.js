/* Native broadphase: depth 4 / grid 16 (0x18177f160); distance max(map)*48
 * (0x18177e630); descriptor inclusive corners (0x18177ec90); coarse two-bit
 * relation (0x18177ec30); CLR introsort threshold 16 (0x1808ef130).
 * Dictionary slot enumeration / LIFO free list: 0x181800370 / 0x1809529a0.
 * Scene live limit 90 per dictionary: 0x1817f6370. Bootstrap capacity 97: request 90 -> first >=90 in cctor 0x18197f4e0
 * metadata field41356 default blob byte6127992 (SHA256 FA856B58...C11175). */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.SourceCollisionBroadphase=api;})(globalThis,function(){
'use strict';
const i64=x=>BigInt.asIntN(64,BigInt(x));
function nativeSort(input,cmp){
 const a=input.slice(),swap=(i,j)=>{const t=a[i];a[i]=a[j];a[j]=t;},greater=(i,j)=>{if(i!==j&&cmp(a[i],a[j])>0)swap(i,j);};
 function down(i,n,lo){const d=a[lo+i-1];while(i<=Math.floor(n/2)){let c=2*i;if(c<n&&cmp(a[lo+c-1],a[lo+c])<0)c++;if(cmp(d,a[lo+c-1])>=0)break;a[lo+i-1]=a[lo+c-1];i=c;}a[lo+i-1]=d;}
 function heap(lo,hi){const n=hi-lo+1;for(let i=Math.floor(n/2);i>=1;i--)down(i,n,lo);for(let i=n;i>1;i--){swap(lo,lo+i-1);down(1,i-1,lo);}}
 function sort(lo,hi,depth){while(hi>lo){const n=hi-lo+1;if(n<=16){if(n===2)greater(lo,hi);else if(n===3){greater(lo,hi-1);greater(lo,hi);greater(hi-1,hi);}else for(let i=lo;i<hi;i++){const t=a[i+1];let j=i;while(j>=lo&&cmp(t,a[j])<0){a[j+1]=a[j];j--;}a[j+1]=t;}return;}if(depth===0){heap(lo,hi);return;}depth--;const mid=lo+Math.floor((hi-lo)/2);greater(lo,mid);greater(lo,hi);greater(mid,hi);const pivot=a[mid];swap(mid,hi-1);let l=lo,r=hi-1;for(;;){do{l++;}while(cmp(a[l],pivot)<0);do{r--;}while(cmp(pivot,a[r])<0);if(l>=r)break;swap(l,r);}swap(l,hi-1);sort(l+1,hi,depth);hi=l-1;}}
 if(a.length>1)sort(0,a.length-1,2*(Math.floor(Math.log2(a.length))+1));return a;
}
const signedByte=x=>(Number(x)<<24)>>24;
const priorityCompare=(a,b)=>signedByte(b.priority)-signedByte(a.priority); // 0x1818007b0
function xCompare(directionRaw){return(a,b)=>{let d=i64(BigInt(a.xRaw)-BigInt(b.xRaw));if(d===0n)return 0;if(BigInt(directionRaw)<=0n)d=i64(-d);return d>0n?-1:1;};} // 0x1818007d0
function initialize(width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||Math.max(width,height)<=0)throw Error('Native positive integer map dimensions required');const distance=i64(BigInt(Math.max(width,height))*48n*65536n),cell=distance/16n;return{depth:4,grid:16,distanceRaw:distance.toString(),cellRaw:cell.toString(),unitRaw:((1n<<32n)/cell).toString(),levelStarts:[0,1,5,21,85],cellCount:341};}
function separate(x){x=(x|(x<<8))&0x00ff00ff;x=(x|(x<<4))&0x0f0f0f0f;x=(x|(x<<2))&0x33333333;return(x|(x<<1))&0x55555555;}
function morton(config,xRaw,yRaw){const x=Number(BigInt.asIntN(32,i64(BigInt(config.unitRaw)*BigInt(xRaw))>>32n)),y=Number(BigInt.asIntN(32,i64(BigInt(config.unitRaw)*BigInt(yRaw))>>32n));return x<0||y<0||x>=16||y>=16?-1:separate(x)|(separate(y)<<1);}
function descriptor(config,c){if(!c.rect)throw Error('Resolved native scaled rectangle required');const r=c.rect,l=i64(BigInt(c.xRaw)+BigInt(r.xRaw)),t=i64(BigInt(c.yRaw)+BigInt(r.yRaw));const tl=morton(config,l,t),br=morton(config,i64(l+BigInt(r.widthRaw)),i64(t+BigInt(r.heightRaw)));if(tl<0||br<0)return{id:c.id,level:0,index:0};const diff=tl^br;let shift=0;for(let i=0;i<4;i++)if((diff>>(2*i))&3)shift=2*i+2;return{id:c.id,level:4-shift/2,index:br>>shift};}
function relation(a,b){if(a.level===b.level)return a.index===b.index;const d=a.level>b.level?a:b,s=d===a?b:a;return(((d.index>>((2*(d.level-s.level))&31))^s.index)&3)===0;}
function dictionary(capacity=97){if(!Number.isInteger(capacity)||capacity<90)throw Error('Native dictionary capacity >= 90 required');return{capacity,buckets:Array(capacity).fill(0),entries:[],usedCount:0,freeCount:0,freeHead:0};}
function bucket(d,key){return(key>>>0)%d.capacity;}
function add(d,key,collision){const b=bucket(d,key);for(let h=d.buckets[b];h;h=d.entries[h-1].next)if(d.entries[h-1].key===key)throw Error('Duplicate collision ID');let h;if(d.freeHead){h=d.freeHead;d.freeHead=d.entries[h-1].next;d.freeCount--;}else{if(d.usedCount===d.capacity)throw Error('Native dictionary growth unsupported');h=++d.usedCount;}d.entries[h-1]={next:d.buckets[b],state:2,key,collision};d.buckets[b]=h;return h;}
function remove(d,key){const b=bucket(d,key);let previous=0;for(let h=d.buckets[b];h;){const e=d.entries[h-1];if(e.key===key){if(previous)d.entries[previous-1].next=e.next;else d.buckets[b]=e.next;e.next=d.freeHead;e.state=1;d.freeHead=h;d.freeCount++;return true;}previous=h;h=e.next;}return false;}
function createStorage(capacity=97){return{primary:dictionary(capacity),secondary:dictionary(capacity),issueId:0};}
function createCollision(s,payload){const d=s.primary.usedCount-s.primary.freeCount<90?s.primary:s.secondary.usedCount-s.secondary.freeCount<90?s.secondary:null;if(!d)return null;s.issueId=(s.issueId+1)|0;const c={...payload,id:s.issueId};add(d,c.id,c);return c;}
function removeCollision(s,id){return remove(s.primary,id)||remove(s.secondary,id);}
// Scene.GetCollisionById0x1817f6940 searches both dictionaries, including
// inactive collision bodies; active() is only the chunk enumeration filter.
function getCollisionById(s,id){if(!Number.isInteger(id)||id< -2147483648||id>2147483647)throw Error('Native signed collision ID required');for(const d of [s.primary,s.secondary])for(let h=d.buckets[bucket(d,id)];h;h=d.entries[h-1].next){const e=d.entries[h-1];if(e.key===id)return e.collision;}return null;}
function active(s){const out=[];for(const d of[s.primary,s.secondary])for(let i=0;i<d.usedCount;i++){const e=d.entries[i];if(e.state===2&&!(e.collision.flags&1))out.push(e.collision);}return out;}
function buildChunk(s,config){return nativeSort(active(s).map(c=>({...descriptor(config,c),priority:c.priority})),priorityCompare);}
function updateDescriptors(chunk,config,lookup){for(let i=0;i<chunk.length;i++){const d=descriptor(config,lookup(chunk[i].id));Object.assign(chunk[i],d);}return chunk;}
function scanCandidates(chunk,visit){for(let i=0;i<chunk.length;i++)for(let j=i+1;j<chunk.length;j++)if(relation(chunk[i],chunk[j]))visit(chunk[i],chunk[j],i,j);}
function compile(actors,count,options={}){if(actors.length)throw Error('Broadphase requires resolved host collisions, not actor compilation');dictionary(options.dictionaryCapacity);return{config:initialize(options.mapWidth,options.mapHeight),capacity:options.dictionaryCapacity};}
function create(c){return{config:c.config,storage:createStorage(c.capacity),chunk:[]};}
return{nativeSort,priorityCompare,xCompare,initialize,morton,descriptor,relation,dictionary,add,remove,createStorage,createCollision,removeCollision,getCollisionById,active,buildChunk,updateDescriptors,scanCandidates,compile,create,solids:()=>[],beforeStep:()=>{},afterStep:()=>{},displays:()=>[],supportedTypes:[]};
});
