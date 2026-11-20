export type EssayCompetencies={c1?:number;c2?:number;c3?:number;c4?:number;c5?:number};
export function calculateEssayScore(c:EssayCompetencies):number{return (Object.values(c) as Array<number|undefined>).reduce<number>((s,v)=>s+(typeof v==="number"&&Number.isFinite(v)?v:0),0);}
export function isValidEssayCompetency(v:number):boolean{return Number.isInteger(v)&&v>=0&&v<=200;}
