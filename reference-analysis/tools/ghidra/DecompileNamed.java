// Decompiles functions from the saved PicoPark2 project by address or by
// IL2CPP name (Type$$Method, or a prefix "Type$$" for every method of a type).
// Output is pseudocode for reading only - cross-check numbers against the
// assembly (tools/disasm.py) before citing them, as AGENTS.md requires.
// @category PICO.StaticAnalysis
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileOptions;
import ghidra.app.decompiler.DecompileResults;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class DecompileNamed extends GhidraScript {
  public void run() throws Exception {
    String[] args = getScriptArgs();
    if (args.length < 2) throw new IllegalArgumentException("output path, then addresses / Type$$Method / Type$$");
    List<Function> targets = new ArrayList<>();
    for (int i = 1; i < args.length; i++) {
      String a = args[i];
      if (a.startsWith("0x")) {
        Function f = getFunctionAt(toAddr(a));
        if (f == null) { disassemble(toAddr(a)); f = createFunction(toAddr(a), "native_" + a.substring(2)); }
        if (f != null) targets.add(f);
        continue;
      }
      FunctionIterator it = currentProgram.getFunctionManager().getFunctions(true);
      while (it.hasNext()) {
        Function f = it.next();
        String n = f.getName();
        if (a.endsWith("$$") ? n.startsWith(a) : (n.equals(a) || n.startsWith(a + "_"))) targets.add(f);
      }
    }
    DecompInterface decomp = new DecompInterface();
    decomp.setOptions(new DecompileOptions());
    StringBuilder out = new StringBuilder("Ghidra pseudocode from the saved PicoPark2 project. Cross-check against assembly.\n");
    try {
      decomp.openProgram(currentProgram);
      for (Function f : targets) {
        out.append("\n== ").append(f.getName()).append(" @ ").append(f.getEntryPoint()).append(" ==\n");
        DecompileResults r = decomp.decompileFunction(f, 120, monitor);
        out.append(r.decompileCompleted() ? r.getDecompiledFunction().getC() : ("FAILED: " + r.getErrorMessage() + "\n"));
      }
    } finally { decomp.dispose(); }
    Files.writeString(Path.of(args[0]), out.toString());
    println("decompiled " + targets.size() + " -> " + args[0]);
  }
}
