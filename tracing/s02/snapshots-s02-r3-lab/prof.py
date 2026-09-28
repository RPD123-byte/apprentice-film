import sys, os
os.environ['ENTRY']='entry_des.js'; sys.argv=[sys.argv[0]]
from run import Lab
L=Lab(); print(L.js('() => LAB.prof()')); L.close()
