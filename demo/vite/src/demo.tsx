import { type PDFiumDocument, PDFium } from "@scaryterry/pdfium/browser";
import wasmUrl from "@scaryterry/pdfium/pdfium.wasm?url";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const useDocument = () => {
  return useQuery({
    queryKey: ["document"],
    queryFn: async () => {
      const response = await fetch("/sample.pdf");
      const arrayBuffer = await response.arrayBuffer();
      const pdfium = await PDFium.init({
        wasmBinary: await fetch(wasmUrl).then((r) => r.arrayBuffer()),
      });
      const document = await pdfium.openDocument(new Uint8Array(arrayBuffer));
      return document;
    },
  });
};

function useRenderPage(
  document: PDFiumDocument,
  options: {
    pageNumber: number;
    scale: number;
  },
) {
  return useQuery({
    queryKey: ["renderPage", options],
    queryFn: () => {
      const page = document.getPage(options.pageNumber);
      const data = page.render({ scale: options.scale });
      return data;
    },
  });
}

function PDFPageDemo(props: { document: PDFiumDocument; pageNumber: number }) {
  const { data: result, status } = useRenderPage(props.document, {
    pageNumber: props.pageNumber,
    scale: 3,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (
      status === "success" &&
      canvasRef.current &&
      result &&
      result.data.length > 0
    ) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const imageData = new ImageData(
          new Uint8ClampedArray(result.data),
          result.width,
          result.height,
        );
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [status, result]);

  if (status === "pending") {
    return <div>Loading...</div>;
  }
  if (status === "error") {
    return <div>Error</div>;
  }

  return (
    <canvas
      ref={canvasRef}
      width={result.width}
      height={result.height}
      style={{ border: "1px solid black", maxWidth: "100%" }}
    />
  );
}

function PDFDocumentDemo() {
  const { data, error, status } = useDocument();
  console.log(data, error, status);
  if (status === "pending") {
    return <div>Loading...</div>;
  }
  if (status === "error") {
    return <div>Error</div>;
  }

  return (
    <>
      <h1 style={{ fontFamily: "sans-serif" }}>PDF viewer</h1>
      <PDFPageDemo document={data} pageNumber={1} />
    </>
  );
}

export default PDFDocumentDemo;
