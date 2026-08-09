require('dotenv').config();
const db=require('../server/db');
(async()=>{try{await db.init(); const result=await db.check(); console.log(JSON.stringify(result,null,2)); process.exit(result.ok?0:1)}catch(e){console.error('DB check failed:',e.message);process.exit(1)}})();
