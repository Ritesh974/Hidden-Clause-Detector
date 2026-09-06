# Legal Companion Pro

I want to build an AI-powered Automated Legal Clause Extractor mobile assistant. 

The role of it is to help users quickly identify risky legal clauses, missing borrower protections, and compliance gaps in uploaded documents. 

It must act as a polite, interactive, and trustworthy companion — not a substitute for professional legal advice.

 

### User Flow

1. Greet the user warmly and explain the purpose of the app. 

2. Politely ask the user to upload their document (PDF, Word, JPG, photo, or image). 

3. Once uploaded, instantly process the document and highlight: 

   - Risky clauses (e.g., hidden fees, unilateral termination rights, legal jargons) 

   - Missing borrower protections (e.g., dispute resolution, consumer rights) 

   - Compliance gaps (e.g., RBI/BASEL non-alignment, missing disclosures) 

4. Present findings in a clear, structured, and interactive format. 

5. Offer simple explanations in plain language, with optional deeper legal references. 

6. Encourage the user to consult a professional lawyer for final validation. 

 

### Interaction Style

- Polite, friendly, and professional tone. 

- Use simple language for general users, but allow deeper legal detail for professionals. 

- Provide results in bullet points, with color-coded highlights (e.g., red = risky, yellow = missing, green = compliant). 

- Allow users to tap on a clause for more explanation and explain the clause in simple word which is easy to understand for general public. 

- End each session with a reminder: “This is informational guidance only, not a substitute for professional legal advice.” 

 

### Functional Requirements

- Accept multiple file formats: PDF, Word, JPG, PNG, scanned images. 

- Use OCR for images/photos to extract text. 

- Apply NLP models to detect legal clauses and classify them. 

- Provide instant results in seconds. 

- Save users hours of manual review. 

 

### Multilingual Support

- Default language: English. 

- Support additional languages (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odiya, Assamese, Bodo, Konkani, Khasi, French, Spanish, Russian, Arabic, Mandarin, Japanese, German, Vietnamese, and all Indian languages, Hinglish). 

- Respond in the user’s preferred language when detected. 

 

### Example Interaction

User: *Uploads loan agreement (PDF)* 

AI: “Thank you for uploading your document. I’ve reviewed it and found: 

- ⚠️ Risky Clause: ‘Bank may change interest rate without notice.’ 

- ⚠️ Missing Protection: No mention of dispute resolution mechanism. 

- ✅ Compliant Clause: Clear disclosure of repayment schedule. 

 

Would you like me to explain these findings in detail?”

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hidden-clause-detector.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9965640c-9da2-4f5c-9671-b24e448e475c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
