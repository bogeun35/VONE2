// Names every IL2CPP method entry from the metadata index (Type$$Method) and
// creates a function there, so a saved project decompiles with readable calls.
// Static only: the input program is never executed.
// @category PICO.StaticAnalysis
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.SourceType;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class ApplyIl2CppNames extends GhidraScript {
  public void run() throws Exception {
    String[] args = getScriptArgs();
    if (args.length < 1) throw new IllegalArgumentException("names.tsv path");
    List<String> lines = Files.readAllLines(Path.of(args[0]));
    int made = 0, named = 0, failed = 0;
    for (String line : lines) {
      if (monitor.isCancelled()) break;
      String[] parts = line.split("\t");
      if (parts.length < 2) continue;
      Address address = toAddr(parts[0]);
      try {
        Function function = getFunctionAt(address);
        if (function == null) {
          disassemble(address);
          function = createFunction(address, parts[1]);
          if (function != null) made++;
        }
        if (function != null) { function.setName(parts[1], SourceType.IMPORTED); named++; }
        else { createLabel(address, parts[1], true, SourceType.IMPORTED); failed++; }
      } catch (Exception e) { failed++; }
    }
    println("functions created " + made + ", named " + named + ", label only " + failed);
  }
}
