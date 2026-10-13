import javax.tools.*;import java.nio.file.*;import java.util.*;import java.net.*;
class VerifyJava {
 public static void main(String[] args) throws Exception {
  JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();
  int checked=0;
  for(String entry:Files.readAllLines(Path.of(args[0]))){String[] fields=entry.split("\\t");String source=Files.readString(Path.of(fields[0]));DiagnosticCollector<JavaFileObject> diagnostics=new DiagnosticCollector<>();
   JavaFileObject object=new SimpleJavaFileObject(URI.create("string:///Practice.java"),JavaFileObject.Kind.SOURCE){public CharSequence getCharContent(boolean ignore){return source;}};
   Path output=Path.of(fields[0]+"-classes");Files.createDirectories(output);
   try(StandardJavaFileManager manager=compiler.getStandardFileManager(diagnostics,null,null)){
    boolean ok=compiler.getTask(null,manager,diagnostics,List.of("-d",output.toString(),"-Xlint:none"),null,List.of(object)).call();
    String report=ok?"OK":diagnostics.getDiagnostics().stream().filter(d->d.getKind()==Diagnostic.Kind.ERROR).findFirst().map(d->d.getLineNumber()+"\t"+d.getMessage(Locale.ENGLISH).replace('\n',' ')).orElse("0\tUnknown");
    Files.writeString(Path.of(fields[0]+".diagnostic"),report);
    if(ok!=Boolean.parseBoolean(fields[1]))throw new RuntimeException(fields[0]+" expected "+fields[1]+" but was "+ok+": "+report);
    checked++;
   }
  }
  System.out.println("Real javac verified "+checked+" snippets.");
 }
}
