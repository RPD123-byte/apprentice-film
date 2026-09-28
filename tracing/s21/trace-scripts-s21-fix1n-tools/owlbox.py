# owlbox(t) -> crop box round the owl (frame px), from the head track
def owlbox(t):
    import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-tools')
    from crop import head
    hx,hy=head(t)
    if t>=73.02: return (max(0,int(hx-150)),0,int(hx+280),230)
    if t>=72.0: return (max(0,int(hx-200)),max(0,int(hy-150)),int(hx+200),min(946,int(hy+180)))
    return (max(0,int(hx-200)),int(hy-80),int(hx+140),min(946,int(hy+115)))
