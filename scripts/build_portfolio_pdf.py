"""Regenerate the optional English project brief (requires Python + reportlab).

This document generator is not part of the application runtime.
Uses actual, dated application screenshots; no network assets.
The default is the approved 5 October English workbench capture.
Optional SHOUYIHUO_BRIEF_SCREENSHOT and SHOUYIHUO_BRIEF_CAPTION override both.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
import shutil
import os

FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')
if FONT_DIR.exists():
 pdfmetrics.registerFont(TTFont('PortfolioSans', str(FONT_DIR/'DejaVuSans.ttf')))
 pdfmetrics.registerFont(TTFont('PortfolioSans-Bold', str(FONT_DIR/'DejaVuSans-Bold.ttf')))
 pdfmetrics.registerFontFamily('PortfolioSans', normal='PortfolioSans', bold='PortfolioSans-Bold')
else:
 # Standard PDF fonts allow regeneration where DejaVu is not installed.
 pdfmetrics.registerFont(pdfmetrics.Font('PortfolioSans', 'Helvetica', 'WinAnsiEncoding'))
 pdfmetrics.registerFont(pdfmetrics.Font('PortfolioSans-Bold', 'Helvetica-Bold', 'WinAnsiEncoding'))
 pdfmetrics.registerFontFamily('PortfolioSans', normal='PortfolioSans', bold='PortfolioSans-Bold')
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/portfolio/Shouyihuo_Project_Brief.pdf'
SCREENSHOT = Path(os.environ.get('SHOUYIHUO_BRIEF_SCREENSHOT', str(ROOT/'docs/screenshots/bilingual-2026-10-05/41-workbench-en-1440.png')))
SCREENSHOT_CAPTION = os.environ.get('SHOUYIHUO_BRIEF_CAPTION', 'Actual English-interface WebGL workbench, recorded on 5 October 2026. The app defaults to English; the English / Chinese switch preserves the current attempt.')
OUT.parent.mkdir(parents=True, exist_ok=True)
W, H = 595.276, 841.89
M, CW = 44, 507.276
GREEN, INK, MUTED = '#1F604A', '#1F2D27', '#52625A'
BG, LINE, LIGHT = '#F6F8F5', '#DCE4DC', '#EAF1EA'
styles = {
 'body': ParagraphStyle('body', fontName='PortfolioSans', fontSize=10.2, leading=14.4, textColor=HexColor(INK)),
 'small': ParagraphStyle('small', fontName='PortfolioSans', fontSize=8.5, leading=11.5, textColor=HexColor(MUTED)),
 'lead': ParagraphStyle('lead', fontName='PortfolioSans', fontSize=13, leading=18, textColor=HexColor(MUTED)),
 'heading': ParagraphStyle('heading', fontName='PortfolioSans-Bold', fontSize=13, leading=17, textColor=HexColor(GREEN)),
}
c = canvas.Canvas(str(OUT), pagesize=(W, H))
c.setTitle('Shouyihuo | An inspectable 3D training simulation')
c.setAuthor('Shouyihuo project | AI-assisted development with OpenAI Codex')
c.setSubject('English technical portfolio brief for Local MVP v0.2')

def para(text, x, top, width=CW, style='body'):
 p=Paragraph(text, styles[style]); _,height=p.wrap(width,H)
 p.drawOn(c,x,H-top-height)
 return top+height

def text(t,x,y,size=10,color=INK,font='PortfolioSans'):
 c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,H-y,t)

def line(y):
 c.setStrokeColor(HexColor(LINE));c.setLineWidth(.6);c.line(M,H-y,W-M,H-y)

def section(number,title,top):
 text(number,M,top+12,9,GREEN,'PortfolioSans-Bold')
 return para(title,M+27,top,CW-27,'heading')+10

def photo(path,x,top,width):
 image=ImageReader(path);iw,ih=image.getSize();height=width*ih/iw
 c.drawImage(image,x,H-top-height,width=width,height=height)
 return top+height

def page(number,label):
 c.setFillColor(HexColor(BG));c.rect(0,0,W,H,fill=1,stroke=0)
 text('SHOUYIHUO / ENGINEERING PORTFOLIO',M,30,8,GREEN,'PortfolioSans-Bold')
 text(label,W-170,30,8,MUTED)
 line(783)
 text('Local MVP v0.2 | Bilingual edition | 5 October 2026',M,803,8,MUTED)
 text(f'{number} / 3',W-M-24,803,8,MUTED)
 text('Source: github.com/echom5713-droid/shouyihuo',M,819,8,GREEN)
 c.linkURL('https://github.com/echom5713-droid/shouyihuo',(M,H-824,M+285,H-809),relative=0)

page(1,'PROJECT OVERVIEW')
text('Shouyihuo',M,83,35,GREEN,'PortfolioSans-Bold')
y=para('An inspectable 3D training simulation',M,99,style='lead')+14
y=para('A local-first, bilingual browser prototype connecting observation, diagnosis, simulated treatment and verification to one explicit state model. English is the default.',M,y)+18
c.setFillColor(HexColor(LIGHT));c.roundRect(M,H-y-39,CW,39,5,fill=1,stroke=0)
text('3 fault cases',M+14,y+24,10,GREEN,'PortfolioSans-Bold')
text('3 learning modes',M+169,y+24,10,GREEN,'PortfolioSans-Bold')
text('No backend or API key',M+333,y+24,10,GREEN,'PortfolioSans-Bold')
y+=54
y=photo(SCREENSHOT,M,y,CW)
y=para(SCREENSHOT_CAPTION,M,y+7,style='small')+19
y=section('01','The problem: keep visual actions and rules consistent',y)
y=para('A convincing model is insufficient if an unsafe action silently succeeds or a camera change affects the score. The prototype makes these constraints testable: rejected disassembly preserves the assembly, records the error and prevents a later safety pass.',M,y)+14
y=para('<b>Built-in course:</b> a simplified gravity-fed toilet cistern with a float-controlled inlet and flapper-style drain seal. Cases cover seal failure, inlet-control failure and a closed supply valve; the last requires no replacement.',M,y)+13
para('<b>Scope:</b> an unaudited teaching model, not repair guidance, a calibrated digital twin or a professional qualification.',M,y)
c.showPage()

page(2,'TECHNICAL DESIGN')
text('One state. Several views.',M,77,25,GREEN,'PortfolioSans-Bold')
y=para('Typed transitions connect the lesson, 3D scene, assessment and local records.',M,91,style='lead')+20
# Compact architecture diagram: 3 visible layers with data/command labels.
boxh=45
for top,title,detail in [(y,'Typed user events','Observe, diagnose, remove, replace, retest, tick'),(y+66,'Pure simulation reducer','Guards + water approximation + verification + score'),(y+132,'Derived interface and validated persistence','React / Three.js read state; localStorage restores it')]:
 c.setFillColor(HexColor(LIGHT));c.roundRect(M,H-top-boxh,CW,boxh,5,fill=1,stroke=0)
 text(title,M+13,top+18,11,GREEN,'PortfolioSans-Bold')
 text(detail,M+13,top+34,9,INK)
for top in [y+45,y+111]:
 c.setStrokeColor(HexColor(GREEN));c.setLineWidth(1);c.line(W/2,H-top-3,W/2,H-top-17)
 c.line(W/2,H-top-17,W/2-3,H-top-13);c.line(W/2,H-top-17,W/2+3,H-top-13)
y+=197
for num,title,body in [
 ('02','Determinism with bounded claims','The same initial state and event sequence produce the same outcome. The UI advances the model by 0.25 simulation seconds per tick; the reducer uses internal steps of at most 0.05 seconds. Water is normalised teaching state, not a measured hydraulic quantity.'),
 ('03','Safety is a gate, not a score deduction','Evidence, diagnosis, process and verification receive 25, 30, 25 and 20 points. Passing also requires correct diagnosis and treatment, complete verification and no critical safety error. Even a 100-point attempt may fail.'),
 ('04','Visual controls cannot bypass business rules','The 3D view reads the authoritative attempt. Cutaway, exploded view, camera focus and workspace expansion change presentation only. Model selection, the part list and the operation target share one selection.'),
 ('05','Persistence preserves both progress and errors','Schema-validated localStorage keeps separate mode sessions and archives each completed attempt once by ID. The original attempt key and schema remain compatible. Locale is a separate preference; changing language cannot repair a fault or erase an error.')]:
 y=section(num,title,y);y=para(body,M,y)+19
para('<b>Inspect in the repository:</b> src/domain/engine.ts, src/storage/local.ts, src/components/TankModel.tsx, tests/engine.test.ts and e2e/flows.spec.ts.',M,y,style='small')
c.showPage()

page(3,'EVIDENCE AND REVIEW')
text('Evidence with clear limits',M,77,25,GREEN,'PortfolioSans-Bold')
y=para('Review the behaviour, the implementation and the recorded checks together.',M,91,style='lead')+19
y=section('06','Verification record',y)
y=para('The <b>5 October 2026 bilingual run</b> passed type checking, <b>47 unit tests</b>, <b>18 browser tests</b> and a production build. The final production-preview status, actual environment, logs and fresh screenshots are recorded in <b>docs/portfolio/VALIDATION.md</b>. Earlier checks are retained separately as dated historical evidence.',M,y)+12
y=para('Browser evidence includes real Canvas selection, all three complete scenario paths, persistence, rejected operations, retained safety errors, legacy-store compatibility and narrow-screen layouts. WebGL was exercised in Linux Chromium through SwiftShader software rendering.',M,y)+17
y=section('07','A failure that changed the implementation',y)
y=para('A viewport change exposed a Canvas sizing regression: the footer intercepted a retest click. The fix constrained the grid and Canvas container. The browser test kept a normal click, rather than forcing it through the obstruction. The failure screenshot and corrective record are retained.',M,y)+18
y=section('08','Review in five minutes',y)
for head,body in [
 ('Run','Use npm ci and npm run dev from the project folder. Open http://127.0.0.1:5173/review/ for the English-default bilingual introduction.'),
 ('Interact','Follow docs/portfolio/REVIEWER_GUIDE.md to complete the supply-valve case, inspect a score report and refresh the saved record.'),
 ('Challenge','Start a new attempt, request premature removal and inspect the rejected action. Complete the case to see why a numeric score alone cannot pass.')]:
 y=para(f'<b>{head}.</b> {body}',M,y)+9
y+=19
y=section('09','Contribution and limitations',y)
y=para('<b>AI-assisted development:</b> the project owner supplied the product brief and acceptance constraints. OpenAI Codex contributed substantial implementation, testing, debugging and documentation. The artefact does not imply unaided solo coding; personal contribution claims require their own evidence.',M,y)+12
y=para('No professional repair review, learner study, physical validation or improved-learning claim is made. Native-GPU performance, every browser/device and physical printing have not been established. Local records are editable and are not formal certificates. The project demonstrates software design and verification practices, not machine learning or computational fluid dynamics.',M,y)+13
para('<b>Reading order:</b> README.md → TECHNICAL_CASE_STUDY.md → VALIDATION.md → source and tests. Contribution details: PROVENANCE.md. All documentation filenames after README are under docs/portfolio/.',M,y,style='small')
c.save()
shutil.copyfile(OUT, ROOT/'public/review/Shouyihuo_Project_Brief.pdf')
print(OUT)
