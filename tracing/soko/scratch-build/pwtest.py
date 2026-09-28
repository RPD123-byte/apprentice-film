from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page()
    pg.set_content("<canvas id=c></canvas>")
    print(pg.evaluate("!!document.getElementById('c').getContext('webgl2')"))
    b.close()
