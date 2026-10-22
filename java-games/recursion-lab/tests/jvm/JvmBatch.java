import javax.tools.*;
import java.io.*;
import java.lang.reflect.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

/** Batch-compiles every .java in a directory in-process and runs each class's main,
 *  capturing stdout with a per-program timeout and a small thread stack.
 *  Output: one line per class, TAB-separated: name, status(OK|EXC|TIMEOUT|COMPILE), payload(JSON-escaped). */
public class JvmBatch {
  static String esc(String s){ StringBuilder b=new StringBuilder("\""); for(char c: s.toCharArray()){ if(c=='"'||c=='\\') b.append('\\').append(c); else if(c=='\n') b.append("\\n"); else if(c=='\r') b.append("\\r"); else if(c=='\t') b.append("\\t"); else if(c<32) b.append(String.format("\\u%04x",(int)c)); else b.append(c);} return b.append('"').toString(); }
  public static void main(String[] a) throws Exception {
    Path dir=Paths.get(a[0]); long timeoutMs=a.length>1?Long.parseLong(a[1]):3000;
    List<File> files=new ArrayList<>(); try(var s=Files.list(dir)){ s.filter(p->p.toString().endsWith(".java")).forEach(p->files.add(p.toFile())); }
    JavaCompiler jc=ToolProvider.getSystemJavaCompiler(); DiagnosticCollector<JavaFileObject> dc=new DiagnosticCollector<>();
    Path out=dir.resolve("classes"); Files.createDirectories(out);
    try(StandardJavaFileManager fm=jc.getStandardFileManager(dc,null,null)){
      boolean ok=jc.getTask(null,fm,dc,List.of("-d",out.toString(),"-nowarn","-Xlint:none","-proc:none"),null,fm.getJavaFileObjectsFromFiles(files)).call();
      Map<String,String> errs=new TreeMap<>();
      for(var d: dc.getDiagnostics()) if(d.getKind()==Diagnostic.Kind.ERROR && d.getSource()!=null){ String n=Paths.get(d.getSource().toUri()).getFileName().toString().replace(".java",""); errs.merge(n,"line "+d.getLineNumber()+": "+d.getMessage(null),(x,y)->x+" | "+y); }
      if(!ok && !errs.isEmpty()){ // recompile the files that had no errors so one bad file does not sink the batch
        List<File> clean=new ArrayList<>(); for(File f: files) if(!errs.containsKey(f.getName().replace(".java",""))) clean.add(f);
        DiagnosticCollector<JavaFileObject> dc2=new DiagnosticCollector<>();
        if(!clean.isEmpty()) jc.getTask(null,fm,dc2,List.of("-d",out.toString(),"-nowarn","-Xlint:none","-proc:none"),null,fm.getJavaFileObjectsFromFiles(clean)).call();
        for(var d: dc2.getDiagnostics()) if(d.getKind()==Diagnostic.Kind.ERROR && d.getSource()!=null){ String n=Paths.get(d.getSource().toUri()).getFileName().toString().replace(".java",""); errs.merge(n,"line "+d.getLineNumber()+": "+d.getMessage(null),(x,y)->x+" | "+y); }
      }
      PrintStream real=System.out;
      URLClassLoader cl=new URLClassLoader(new URL[]{out.toUri().toURL()});
      for(File f: files){ String n=f.getName().replace(".java","");
        if(errs.containsKey(n)||!Files.exists(out.resolve(n+".class"))){ real.println(n+"\tCOMPILE\t"+esc(errs.getOrDefault(n,"no class (batch failed: "+ok+")"))); continue; }
        ByteArrayOutputStream buf=new ByteArrayOutputStream(); PrintStream ps=new PrintStream(buf,true,"UTF-8");
        String[] status={"OK"}; String[] extra={""};
        Thread t=new Thread(null,()->{ try{ Class<?> c=cl.loadClass(n); Method m=c.getMethod("main",String[].class); System.setOut(ps); m.invoke(null,(Object)new String[0]); }
          catch(InvocationTargetException e){ status[0]="EXC"; extra[0]=e.getCause().getClass().getSimpleName(); }
          catch(Throwable e){ status[0]="EXC"; extra[0]=e.getClass().getSimpleName(); } finally { System.setOut(real);} }, "run-"+n, 1<<20);
        t.setDaemon(true); t.start(); t.join(timeoutMs); if(t.isAlive()){ status[0]="TIMEOUT"; }
        System.setOut(real);
        String payload=buf.toString("UTF-8"); if(!extra[0].isEmpty()) payload=payload+"\u0000"+extra[0];
        real.println(n+"\t"+status[0]+"\t"+esc(payload));
      }
    }
    System.out.flush(); System.exit(0);
  }
}
