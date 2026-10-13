// Targeted static import: no whole-program auto analysis, never executes input.
// @category PICO.StaticAnalysis
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import java.nio.file.Files;
import java.nio.file.Path;

public class LeadSelectedDecompile extends GhidraScript {
  public void run() throws Exception {
    String[] args = getScriptArgs();
    if (args.length < 2) throw new IllegalArgumentException("output path, then entry addresses");
    DecompInterface decomp = new DecompInterface();
    StringBuilder output = new StringBuilder("Targeted Ghidra import; automatic analysis disabled. Cross-check assembly.\n");
    try {
      for (int i=1; i<args.length; i++) {
        Address address = toAddr(args[i]);
        disassemble(address);
        if (getFunctionAt(address) == null) createFunction(address, "native_" + args[i].replace("0x", ""));
      }
      decomp.openProgram(currentProgram);
      for (int i=1; i<args.length; i++) {
        Function function = getFunctionAt(toAddr(args[i]));
        output.append("\n== ").append(args[i]).append(" ==\n");
        if (function == null) { output.append("FUNCTION CREATION FAILED\n"); continue; }
        DecompileResults result = decomp.decompileFunction(function, 60, monitor);
        output.append(result.decompileCompleted() ? result.getDecompiledFunction().getC() : result.getErrorMessage());
        Files.writeString(Path.of(args[0]), output.toString());
      }
    } finally { decomp.dispose(); }
  }
}
