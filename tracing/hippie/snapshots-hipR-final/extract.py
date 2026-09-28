import subprocess, sys
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
FILM='/Users/computer/rootline/apprentice-film/renders/film.mp4'
TS=[88.6,90,92,95,96.8,97.2,98.4,100.2,100.4,101,104,107,110.4,114,115.4,117.4,118,120,124,128]
if len(sys.argv)>1: TS=[float(x) for x in sys.argv[1].split(',')]
for t in TS:
    n=round(t*25)
    for tag,f in (('src',SRC),('film',FILM)):
        subprocess.run(['ffmpeg','-v','error','-y','-ss',f'{n/25-0.02:.3f}','-i',f,'-frames:v','1',f'{tag}-{t:.1f}.png'],check=True)
    print(t, n)
