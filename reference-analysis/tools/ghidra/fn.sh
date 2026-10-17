#!/bin/sh
# print one decompiled function with il2cpp boilerplate stripped: fn.sh FILE NAME
awk -v n="== $2 @" 'index($0,n)==1{p=1;print;next} /^== /{if(p)exit} p' "$1" | grep -v "^\s*$" \
 | grep -v "FUN_1802ec040(\|+ 0xe0) == 0) {$\|LOCK();\|UNLOCK();\|FUN_1802c5dc0(\|cRam0000000183.* = '\\x01';\|^\s*}$\|^\s*undefined[0-9]* [a-zA-Z_]*;$\|^\s*longlong [a-zA-Z_0-9]*;$\|^\s*int [a-zA-Z_0-9]*;$\|^\s*code \*pcVar[0-9]*;$\|^\s*char [a-zA-Z_0-9]*;$\|^\s*if (cRam0000000183.* == '\\0') {$\|^\s*if (DAT_1833.* == '\\0') {$\|FUN_18032a5e0();\|swi(3)\|(\*pcVar[0-9]*)();\|^\s*return;$\|^\s*bool [a-zA-Z_0-9]*;$\|^\s*uint [a-zA-Z_0-9]*;$\|^\s*ulonglong [a-zA-Z_0-9]*;$\|^\s*short [a-zA-Z_0-9]*;$\|WARNING"
