// Batch javac + JVM runner for ArrayList Lab tests (adapted from MethodLabCompile.java).
// Usage: java tests/ArrayListLabCompile.java <manifest>
// Manifest records:
//   @@CHECK <id> <main-class or ->
//   @@FILE <File.java>
//   ...source lines...
//   @@END
// Output, one line per check: <id> OK <base64 stdout>  |  <id> ERROR <base64 first diagnostic>
import javax.tools.*;
import java.io.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class ArrayListLabCompile {
    static class Src extends SimpleJavaFileObject {
        final String code;
        Src(String name, String code) { super(URI.create("string:///" + name), Kind.SOURCE); this.code = code; }
        public CharSequence getCharContent(boolean ignore) { return code; }
    }
    static class Out extends SimpleJavaFileObject {
        final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        Out(String name) { super(URI.create("bytes:///" + name), Kind.CLASS); }
        public OutputStream openOutputStream() { return bytes; }
    }
    public static void main(String[] args) throws Exception {
        List<String> lines = Files.readAllLines(Paths.get(args[0]), StandardCharsets.UTF_8);
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        StandardJavaFileManager std = javac.getStandardFileManager(null, null, StandardCharsets.UTF_8);
        PrintStream realOut = System.out;
        StringBuilder report = new StringBuilder();
        int i = 0;
        while (i < lines.size()) {
            String line = lines.get(i++);
            if (!line.startsWith("@@CHECK ")) continue;
            String[] head = line.split(" ");
            String id = head[1], main = head[2];
            List<JavaFileObject> files = new ArrayList<>();
            String name = null;
            StringBuilder sb = null;
            while (i < lines.size()) {
                String l = lines.get(i++);
                if (l.startsWith("@@FILE ") || l.equals("@@END")) {
                    if (name != null) files.add(new Src(name, sb.toString()));
                    if (l.equals("@@END")) break;
                    name = l.substring(7);
                    sb = new StringBuilder();
                } else sb.append(l).append('\n');
            }
            Map<String, Out> classes = new HashMap<>();
            JavaFileManager fm = new ForwardingJavaFileManager<JavaFileManager>(std) {
                public JavaFileObject getJavaFileForOutput(Location loc, String cls, JavaFileObject.Kind kind, FileObject sibling) {
                    Out o = new Out(cls);
                    classes.put(cls, o);
                    return o;
                }
            };
            DiagnosticCollector<JavaFileObject> diags = new DiagnosticCollector<>();
            boolean ok = javac.getTask(null, fm, diags, List.of("-Xlint:none", "-proc:none"), null, files).call();
            if (!ok) {
                String msg = "";
                for (Diagnostic<? extends JavaFileObject> d : diags.getDiagnostics())
                    if (d.getKind() == Diagnostic.Kind.ERROR) { msg = d.getSource().getName() + ":" + d.getLineNumber() + ": " + d.getMessage(null); break; }
                report.append(id).append(" ERROR ").append(Base64.getEncoder().encodeToString(msg.getBytes(StandardCharsets.UTF_8))).append('\n');
                continue;
            }
            String output = "";
            if (!main.equals("-")) {
                ClassLoader loader = new ClassLoader(ArrayListLabCompile.class.getClassLoader()) {
                    protected Class<?> findClass(String n) throws ClassNotFoundException {
                        Out o = classes.get(n);
                        if (o == null) throw new ClassNotFoundException(n);
                        byte[] b = o.bytes.toByteArray();
                        return defineClass(n, b, 0, b.length);
                    }
                };
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
                try {
                    loader.loadClass(main).getMethod("main", String[].class).invoke(null, (Object) new String[0]);
                } catch (Throwable t) {
                    Throwable c = (t instanceof java.lang.reflect.InvocationTargetException && t.getCause() != null) ? t.getCause() : t; System.out.print("EXCEPTION " + c);
                } finally {
                    System.setOut(realOut);
                }
                output = buf.toString(StandardCharsets.UTF_8);
            }
            report.append(id).append(" OK ").append(Base64.getEncoder().encodeToString(output.getBytes(StandardCharsets.UTF_8))).append('\n');
        }
        realOut.print(report);
    }
}
