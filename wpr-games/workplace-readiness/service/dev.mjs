import { createServer } from 'node:http';
import { readFileSync, statSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { timingSafeEqual, randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import worker from './worker.mjs';

export function sqliteAdapter(db) {
  return {
    prepare(sql) {
      const s = db.prepare(sql);
      const bind = (...args) => ({
        first: async () => s.get(...args),
        all: async () => ({ results:s.all(...args) }),
        run: async () => ({ meta:s.run(...args) })
      });
      return { ...bind(), bind };
    }
  };
}
const root = fileURLToPath(new URL('../../../',import.meta.url));
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml' };
export async function startDev({ port = 0, filename = ':memory:', teacherTokens, submissionSecret = randomBytes(32).toString('hex') }) {
  const db = new DatabaseSync(filename);
  db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('./profiles.sql',import.meta.url),'utf8'));
  const DB = sqliteAdapter(db);
  const verifyLocalTeacher = token => {
    const supplied = Buffer.from(token);
    for (const [name,secret] of Object.entries(teacherTokens)) {
      const expected = Buffer.from(secret);
      if (expected.length >= 24 && supplied.length === expected.length && timingSafeEqual(supplied,expected)) return name;
    }
    return null;
  };
  let origin;
  const server = createServer(async (req,res) => {
    const url = new URL(req.url,origin);
    if (url.pathname.startsWith('/api/wpr/')) {
      try {
        const request = new Request(url,{method:req.method,headers:req.headers,
          ...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
        const response = await worker.fetch(request,{DB,verifyLocalTeacher,ENABLE_STUDENT_PROFILES:'1',SUBMISSION_SECRET:submissionSecret,ALLOWED_ORIGINS:origin+',http://localhost:'+url.port});
        res.writeHead(response.status,Object.fromEntries(response.headers));
        return res.end(await response.text());
      } catch {
        res.writeHead(500);return res.end('Development server error.');
      }
    }
    try {
      const name = decodeURIComponent(url.pathname);
      if (name.split('/').some(p=>p.startsWith('.') || ['service','node_modules'].includes(p))) throw new Error();
      let file = resolve(root,'.'+name);
      if (!file.startsWith(resolve(root)+sep) && file !== resolve(root)) throw new Error();
      if (statSync(file).isDirectory()) file = resolve(file,'index.html');
      if (!statSync(file).isFile()) throw new Error();
      res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
      createReadStream(file).pipe(res);
    } catch {res.writeHead(404);res.end('Not found.');}
  });
  await new Promise(resolve => server.listen(port,'127.0.0.1',()=>{
    origin='http://127.0.0.1:'+server.address().port;
    resolve();
  }));
  return { server, db, url:origin };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const key = process.env.WPR_DEV_TEACHER_TOKEN;
  if (!key || key.length < 24) throw new Error('Set WPR_DEV_TEACHER_TOKEN to a random secret of at least 24 characters.');
  if (process.env.WPR_DEV_DB && (!process.env.WPR_DEV_SUBMISSION_SECRET || process.env.WPR_DEV_SUBMISSION_SECRET.length < 32))
    throw new Error('Persistent development DBs require WPR_DEV_SUBMISSION_SECRET with at least 32 characters.');
  const {url} = await startDev({submissionSecret:process.env.WPR_DEV_SUBMISSION_SECRET,port:Number(process.env.PORT || 8791),filename:process.env.WPR_DEV_DB || ':memory:',teacherTokens:{'local-teacher':key}});
  console.log('Workplace Readiness development site: ' + url + '/cs-games/teacher/');
}
