import docx

def convert_docx_to_md(docx_path, md_path):
    doc = docx.Document(docx_path)
    with open(md_path, 'w', encoding='utf-8') as f:
        for para in doc.paragraphs:
            f.write(para.text + '\n\n')

if __name__ == "__main__":
    convert_docx_to_md("Economics Source Library — Categories, Sources & Concept Notes.docx", "content/source.md")
    print("Conversion successful")
