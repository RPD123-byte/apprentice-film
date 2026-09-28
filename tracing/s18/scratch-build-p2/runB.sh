set -e
cd /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/p2
python3 owlB_prep.py
python3 owlB_model.py 2>&1 | grep -v -i warn | grep -v nanmean | tail -3
python3 owlB_tail.py | tail -3
cd /Users/computer/rootline/apprentice-film/src/shots/s18/trace
python3 trace_owlB.py /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/p2 ../owlBTrace.js | tr '\n' ' '
echo RUNB_DONE
