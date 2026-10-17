/* Documentation Lab test harness (development only — never loaded by students).
   Usage: java JavaCheck.java <unitsDir>
   Each subdirectory of unitsDir is one independent compilation unit:
     *.java     sources to compile together
     MODE       "compile", "doclint", or "run"
   Compiles with the in-process javac (--release 17). "doclint" units add
   -Xdoclint:all,-missing/private so malformed Javadoc (unknown @param names,
   @return on void methods, ...) is an error. "run" units execute Main.main
   and capture standard output.
   Prints one line per unit:  id <TAB> OK|COMPILE_ERROR|RUN_ERROR <TAB> detail  */
import javax.tools.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;

public class JavaCheck {
    public static void main(String[] args) throws Exception {
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        File[] units = new File(args[0]).listFiles(File::isDirectory);
        Arrays.sort(units);
        PrintStream realOut = System.out;
        for (File unit : units) {
            String mode = Files.readString(unit.toPath().resolve("MODE")).trim();
            File out = new File(unit, "out");
            out.mkdirs();
            List<String> opts = new ArrayList<>(List.of("--release", "17", "-d", out.getPath(), "-Xlint:none"));
            if (mode.equals("doclint")) opts.add("-Xdoclint:all,-missing/private");
            DiagnosticCollector<JavaFileObject> diags = new DiagnosticCollector<>();
            StandardJavaFileManager fm = javac.getStandardFileManager(diags, null, null);
            List<File> srcs = new ArrayList<>();
            for (File f : unit.listFiles()) if (f.getName().endsWith(".java")) srcs.add(f);
            boolean ok = javac.getTask(null, fm, diags, opts, null, fm.getJavaFileObjectsFromFiles(srcs)).call();
            StringBuilder msg = new StringBuilder();
            for (Diagnostic<? extends JavaFileObject> d : diags.getDiagnostics())
                if (d.getKind() == Diagnostic.Kind.ERROR || (mode.equals("doclint") && d.getKind() == Diagnostic.Kind.WARNING))
                    msg.append(d.getLineNumber()).append(": ").append(d.getMessage(null).replace('\n', ' ')).append(" | ");
            fm.close();
            if (!ok || (mode.equals("doclint") && msg.length() > 0)) {
                realOut.println(unit.getName() + "\tCOMPILE_ERROR\t" + msg);
                continue;
            }
            if (!mode.equals("run")) {
                realOut.println(unit.getName() + "\tOK\t");
                continue;
            }
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            try (URLClassLoader cl = new URLClassLoader(new URL[] { out.toURI().toURL() }, null)) {
                System.setOut(new PrintStream(buf, true, "UTF-8"));
                cl.loadClass("Main").getMethod("main", String[].class).invoke(null, (Object) new String[0]);
                System.setOut(realOut);
                realOut.println(unit.getName() + "\tOK\t" + buf.toString("UTF-8").replace("\n", "\\n"));
            } catch (Throwable t) {
                System.setOut(realOut);
                Throwable c = t.getCause() != null ? t.getCause() : t;
                realOut.println(unit.getName() + "\tRUN_ERROR\t" + c);
            }
        }
    }
}
