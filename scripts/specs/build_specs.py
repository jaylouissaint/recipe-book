"""Build the Recipe Book specs by reusing the Financial Planner .docx packages.

Everything except the body text (styles, numbering, theme, settings, page setup) is copied
from the planner files, and the body uses the same paragraph/table XML patterns, so the two
projects' documents look the same. The text lives in spec_content.py.

    python3 scripts/specs/build_specs.py [planner spec dir] [output dir]
"""
import os
import re
import sys
import zipfile
from xml.sax.saxutils import escape

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spec_content import FUNCTIONAL, TECHNICAL, FUNCTIONAL_FOOTER, TECHNICAL_FOOTER, DOC_TIMESTAMP  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else (
    "/Users/louis/Desktop/Career and Financial Future/financial-planner/Specification Documentation"
)
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "Specification Documentation")

F_CELL = '<w:sz w:val="16"/>'
T_HEAD = '<w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/>'
T_BODY = '<w:color w:val="263238"/><w:sz w:val="17"/>'
CALLOUT_TITLE = '<w:b/><w:color w:val="14213D"/><w:sz w:val="20"/>'
CALLOUT_BODY = '<w:color w:val="263238"/><w:sz w:val="18"/>'
TABLE_LOOK = (
    '<w:tblLook w:firstColumn="1" w:firstRow="1" w:lastColumn="0" w:lastRow="0" '
    'w:noHBand="0" w:noVBand="1" w:val="04A0"/>'
)
MAR = (
    '<w:tcMar><w:top w:w="100" w:type="dxa"/><w:start w:w="120" w:type="dxa"/>'
    '<w:bottom w:w="100" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar>'
)


def run(text, rpr=""):
    rpr = f"<w:rPr>{rpr}</w:rPr>" if rpr else ""
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


def p(text="", style=None, ppr="", rpr=""):
    props = (f'<w:pStyle w:val="{style}"/>' if style else "") + ppr
    props = f"<w:pPr>{props}</w:pPr>" if props else ""
    return f"<w:p>{props}{run(text, rpr) if text else ''}</w:p>"


def grid(widths):
    return "<w:tblGrid>" + "".join(f'<w:gridCol w:w="{w}"/>' for w in widths) + "</w:tblGrid>"


# ---- Functional Specification patterns ("LightShading-Accent1" tables, 8pt cells)
def f_cell(text, width):
    return (
        f'<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="{width}"/><w:vAlign w:val="center"/></w:tcPr>'
        f'<w:p><w:pPr><w:spacing w:after="20"/></w:pPr>{run(text, F_CELL)}</w:p></w:tc>'
    )


def f_table(widths, rows):
    body = "".join(
        "<w:tr>" + "".join(f_cell(c, w) for c, w in zip(r, widths)) + "</w:tr>" for r in rows
    )
    return (
        '<w:tbl><w:tblPr><w:tblStyle w:val="LightShading-Accent1"/><w:tblW w:type="auto" w:w="0"/>'
        f'<w:jc w:val="center"/>{TABLE_LOOK}</w:tblPr>{grid(widths)}{body}</w:tbl>' + p()
    )


# ---- Technical Specification patterns (navy header "TableGrid" tables, callout boxes)
def t_cell(text, width, header):
    if header:
        return (
            f'<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="{width}"/><w:shd w:fill="14213D"/>'
            f'<w:vAlign w:val="center"/>{MAR}</w:tcPr><w:p>{run(text, T_HEAD)}</w:p></w:tc>'
        )
    return (
        f'<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="{width}"/><w:vAlign w:val="center"/>{MAR}</w:tcPr>'
        f'<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>{run(text, T_BODY)}</w:p></w:tc>'
    )


def t_table(widths, rows):
    body = "".join(
        "<w:tr>" + "".join(t_cell(c, w, i == 0) for c, w in zip(r, widths)) + "</w:tr>"
        for i, r in enumerate(rows)
    )
    return (
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:type="auto" w:w="0"/>'
        f'<w:jc w:val="center"/>{TABLE_LOOK}</w:tblPr>{grid(widths)}{body}</w:tbl>'
        + p(ppr='<w:spacing w:after="20"/>')
    )


def callout(title, text):
    return (
        f'<w:tbl><w:tblPr><w:tblW w:type="auto" w:w="0"/><w:jc w:val="center"/>{TABLE_LOOK}</w:tblPr>'
        f'{grid([10080])}<w:tr><w:tc><w:tcPr><w:tcW w:type="dxa" w:w="10080"/><w:shd w:fill="F4F7FB"/>'
        '<w:tcMar><w:top w:w="150" w:type="dxa"/><w:start w:w="180" w:type="dxa"/>'
        '<w:bottom w:w="150" w:type="dxa"/><w:end w:w="180" w:type="dxa"/></w:tcMar></w:tcPr><w:p>'
        f'<w:r><w:rPr>{CALLOUT_TITLE}</w:rPr><w:t xml:space="preserve">{escape(title)}</w:t><w:br/></w:r>'
        f"{run(text, CALLOUT_BODY)}</w:p></w:tc></w:tr></w:tbl>" + p(ppr='<w:spacing w:after="20"/>')
    )


def render(blocks, table):
    out = []
    for kind, *args in blocks:
        if kind == "h1":
            out.append(p(args[0], "Heading1"))
        elif kind == "h2":
            out.append(p(args[0], "Heading2"))
        elif kind == "p":
            out.append(p(args[0]))
        elif kind == "bullets":
            out += [p(b, "ListBullet", '<w:spacing w:after="40"/>') for b in args[0]]
        elif kind == "req":  # FR id + title, body, acceptance, verification status
            rid, title, body, acc, status = args
            out += [
                p(f"{rid}  {title}", "Heading2"),
                p(body),
                p(f"Acceptance: {acc}"),
                p(f"Verification status: {status}"),
            ]
        elif kind == "table":
            out.append(table(*args))
        elif kind == "callout":
            out.append(callout(*args))
        elif kind == "pagebreak":
            out.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
        elif kind == "raw":
            out.append(args[0])
        else:
            raise ValueError(kind)
    return "".join(out)


def build(src_name, out_name, body_xml, footer_text):
    with zipfile.ZipFile(os.path.join(SRC, src_name)) as zin, zipfile.ZipFile(
        os.path.join(OUT, out_name), "w", zipfile.ZIP_DEFLATED
    ) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                x = data.decode()
                head = x[: x.index("<w:body>") + len("<w:body>")]
                sect = re.findall(r"<w:sectPr.*?</w:sectPr>", x, re.S)[-1]
                data = (head + body_xml + sect + "</w:body></w:document>").encode()
            elif item.filename == "word/footer1.xml":
                x = data.decode()
                data = re.sub(
                    r"(<w:t[^>]*>)[^<]*(</w:t>)",
                    lambda m: m.group(1) + escape(footer_text) + m.group(2),
                    x,
                    count=1,
                ).encode()
            elif item.filename == "docProps/core.xml":
                x = data.decode()
                title = out_name.replace("_", " ").removesuffix(".docx")
                x = re.sub(r"<dc:title\s*/>|<dc:title>.*?</dc:title>", f"<dc:title>{escape(title)}</dc:title>", x)
                x = re.sub(r"<dc:creator>.*?</dc:creator>", "<dc:creator>Louis</dc:creator>", x)
                x = re.sub(r"<dc:description>.*?</dc:description>", "<dc:description/>", x)
                x = re.sub(r"(<dcterms:(created|modified)[^>]*>)[^<]*", r"\g<1>" + DOC_TIMESTAMP, x)
                data = x.encode()
            zout.writestr(item, data)
    print("wrote", os.path.join(OUT, out_name))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build(
        "Financial_Planner_Functional_Specification.docx",
        "Recipe_Book_Functional_Specification.docx",
        render(FUNCTIONAL, f_table),
        FUNCTIONAL_FOOTER,
    )
    build(
        "Financial_Planner_Technical_Specification.docx",
        "Recipe_Book_Technical_Specification.docx",
        render(TECHNICAL, t_table),
        TECHNICAL_FOOTER,
    )
