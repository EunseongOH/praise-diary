const lum=h=>{const v=h.match(/\w\w/g).map(s=>parseInt(s,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722};
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
for(const [name,a,b,min] of [['strong','E9E4F2','1E1C27',4.5],['default','B8AEC8','1E1C27',4.5],['quiet','A79DB6','1E1C27',4.5],['focus','D3C2EF','1E1C27',3],['CTA text','E9E4F2','282631',4.5],['pressed quiet','A79DB6','363040',4.5]]){let r=ratio(a,b);console.log(name,r.toFixed(2),r>=min?'PASS':'FAIL');if(r<min)process.exitCode=1;}
console.log('CTA border/background (informational)',ratio('585164','1E1C27').toFixed(2));
