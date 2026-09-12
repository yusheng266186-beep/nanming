// Reads a private issued-code record without printing credentials or student details.
// Validates the real local lookup and returned shard. It does not contact a cloud endpoint.
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createSchoolAccess } from "../../apps/api/src/school-access.ts";

const rows=readFileSync(new URL("../../../private/quality-huixi-codes.csv",import.meta.url),"utf8").trim().split(/\r?\n/);
const headers=rows[0].split(",");
const values=rows[1].split(",");
const field=(name)=>values[headers.indexOf(name)];
const server=createServer(createSchoolAccess({NANHANG_AI_PROFILE:"development"}));
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try{
  const url=`http://127.0.0.1:${server.address().port}`;
  const send=(name,code)=>fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,code})});
  const wrong=await send("本地核验用不存在姓名",field("验证码6位"));
  assert.equal(wrong.status,401);
  const right=await send(field("姓名"),field("验证码6位"));
  assert.equal(right.status,200);
  const data=await right.json();assert.equal(data.shard.person.publicId,field("public_id"));assert.ok(data.shard.exams.length>0);
  const result={date:"2026-09-12",status:"passed",checks:["real local identity+code pair returns its own shard","wrong name with same code is rejected"],privateDataPrinted:false,network:"loopback only",scope:"one issued identity; not a full-school audit"};
  writeFileSync(new URL("school-local-result.json",import.meta.url),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{await new Promise(resolve=>server.close(resolve));}
