import javax.tools.*;
import java.io.*;
import java.lang.reflect.*;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/**
 * Independent Java oracle for the Math Lab expansion tests.
 *
 * Input: a directory of N.java files (each declares public class C_N with main).
 * All sources are compiled in memory by the real javac. Sources that fail to
 * compile are reported as COMPILE_ERROR; the rest are compiled again together,
 * loaded, and run with System.out captured.
 *
 * Output (one line per source, tab separated):
 *   id  OK         escaped-stdout
 *   id  EXCEPTION  ExceptionSimpleName  escaped-stdout-before-exception
 *   id  COMPILE_ERROR  first-error-message
 */
public class JavaOracle {
    static final Map<String, byte[]> classes = new HashMap<>();

    static class Src extends SimpleJavaFileObject {
        final String code; final String id;
        Src(String id, String code) { super(URI.create("string:///C_" + id + ".java"), Kind.SOURCE); this.code = code; this.id = id; }
        public CharSequence getCharContent(boolean ignore) { return code; }
    }
    static class Out extends SimpleJavaFileObject {
        final String name; final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        Out(String name) { super(URI.create("bytes:///" + name.replace('.', '/') + ".class"), Kind.CLASS); this.name = name; }
        public OutputStream openOutputStream() { return new FilterOutputStream(bytes) { public void close() throws IOException { super.close(); classes.put(name, bytes.toByteArray()); } }; }
    }

    static Set<String> compile(JavaCompiler javac, List<Src> sources) {
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        StandardJavaFileManager std = javac.getStandardFileManager(diagnostics, null, StandardCharsets.UTF_8);
        JavaFileManager fm = new ForwardingJavaFileManager<>(std) {
            public JavaFileObject getJavaFileForOutput(Location l, String name, JavaFileObject.Kind k, FileObject s) { return new Out(name); }
        };
        javac.getTask(null, fm, diagnostics, List.of("-Xlint:none", "-proc:none", "-Xmaxerrs", "1000000"), null, sources).call();
        Set<String> failed = new LinkedHashSet<>();
        for (Diagnostic<? extends JavaFileObject> d : diagnostics.getDiagnostics())
            if (d.getKind() == Diagnostic.Kind.ERROR && d.getSource() instanceof Src s) {
                if (failed.add(s.id)) errors.put(s.id, d.getMessage(Locale.ENGLISH).replace('\n', ' ').replace('\t', ' '));
            }
        return failed;
    }
    static final Map<String, String> errors = new HashMap<>();

    static String esc(String s) { return s.replace("\\", "\\\\").replace("\r", "").replace("\n", "\\n").replace("\t", "\\t"); }

    public static void main(String[] args) throws Exception {
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        List<Src> all = new ArrayList<>();
        try (DirectoryStream<Path> dir = Files.newDirectoryStream(Path.of(args[0]), "*.java")) {
            for (Path p : dir) {
                String id = p.getFileName().toString().replace(".java", "");
                all.add(new Src(id, Files.readString(p)));
            }
        }
        all.sort(Comparator.comparing(s -> s.id));
        // javac stops before attribution when any file has a syntax error, so type
        // errors in other files surface only in a later round. Repeat until clean.
        Set<String> failed = new LinkedHashSet<>();
        for (int round = 0; ; round++) {
            if (round > 10) throw new IllegalStateException("Compilation did not converge");
            classes.clear();
            List<Src> good = new ArrayList<>();
            for (Src s : all) if (!failed.contains(s.id)) good.add(s);
            Set<String> fresh = compile(javac, good);
            if (fresh.isEmpty()) break;
            failed.addAll(fresh);
        }
        ClassLoader loader = new ClassLoader(JavaOracle.class.getClassLoader()) {
            protected Class<?> findClass(String name) throws ClassNotFoundException {
                byte[] b = classes.get(name);
                if (b == null) throw new ClassNotFoundException(name);
                return defineClass(name, b, 0, b.length);
            }
        };
        PrintStream realOut = System.out;
        StringBuilder report = new StringBuilder();
        for (Src s : all) {
            if (failed.contains(s.id)) { report.append(s.id).append("\tCOMPILE_ERROR\t").append(errors.get(s.id)).append('\n'); continue; }
            ByteArrayOutputStream captured = new ByteArrayOutputStream();
            System.setOut(new PrintStream(captured, true, StandardCharsets.UTF_8));
            String status = "OK", exception = null;
            try {
                Method main = loader.loadClass("C_" + s.id).getMethod("main", String[].class);
                main.invoke(null, (Object) new String[0]);
            } catch (InvocationTargetException e) {
                status = "EXCEPTION"; exception = e.getCause().getClass().getSimpleName();
            } finally { System.out.flush(); System.setOut(realOut); }
            String text = captured.toString(StandardCharsets.UTF_8);
            report.append(s.id).append('\t').append(status);
            if (exception != null) report.append('\t').append(exception);
            report.append('\t').append(esc(text)).append('\n');
        }
        Files.writeString(Path.of(args[1]), report.toString());
        realOut.println("JavaOracle: compiled and ran " + all.size() + " programs (" + failed.size() + " compile errors as reported by javac).");
    }
}
