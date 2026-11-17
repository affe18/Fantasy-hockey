module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET'});}
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'';
 const anonKey=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
 if(!url||!anonKey)return res.status(503).json({configured:false,error:'Supabase is not configured.'});
 return res.status(200).json({configured:true,url,anonKey});
};