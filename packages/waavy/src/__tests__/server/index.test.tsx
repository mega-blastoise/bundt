import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import React from "react";
import * as ReactDOMServer from "react-dom/server";
import { Writable } from "stream";
import type { WriteStream } from "fs";
import PeerDependencyManager from "@/utils/models/PeerDependencyManager";
import {
  transformComponentToString,
  transformComponentToReadableStream,
  pipeComponent,
  pipeComponentToWritableCallbacks,
  pipeComponentToStdout,
  pipeComponentToNodeStream,
} from "@/server";

import { SimpleComponent, ComponentWithProps, NestedComponent } from "./components";

describe("<lib/server/index.tsx/*>", () => {
  describe("[module:transformComponentToString]", () => {
    test("it should render simple component to string", async () => {
      const component = React.createElement(SimpleComponent);
      const result = transformComponentToString(component);
      expect(typeof result).toBe("string");
      expect(result).toContain('<div id="test">Hello World</div>');
    });

    test("it should render a component with props to string", async () => {
      const component = React.createElement(ComponentWithProps, {
        name: "John",
        age: 25,
      });
      const result = transformComponentToString(component);
      expect(result).toBe("<div>Hello John, age 25</div>");
      expect(result).toContain("Hello John, age 25");
    });

    test("it should render nested components to string", async () => {
      const component = React.createElement(NestedComponent);
      const result = transformComponentToString(component);
      expect(result).toContain('<div class="container">');
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<p>Content</p>");
    });

    test("it should handle empty component", async () => {
      const EmptyComponent = () => false;
      const component = React.createElement(EmptyComponent);
      const result = transformComponentToString(component);
      expect(result).toBe("");
    });

    test("it should pass through server options", async () => {
      // Spy on the PeerDependencyManager instead of the imported ReactDOMServer
      const mockReactDOMServer = {
        renderToString: spyOn(ReactDOMServer, "renderToString").mockReturnValue("<div>test</div>"),
      };
      const peerDepSpy = spyOn(PeerDependencyManager, "useReactDOMServer").mockResolvedValue(
        mockReactDOMServer as any,
      );

      const component = React.createElement(SimpleComponent);
      const options = { identifierPrefix: "test-" };
      transformComponentToString(component, options);

      expect(mockReactDOMServer.renderToString).toHaveBeenCalledWith(component, options);

      peerDepSpy.mockRestore();
      mockReactDOMServer.renderToString.mockRestore();
    });

    test("should handle component with fragments", async () => {
      const FragmentComponent = () =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement("span", null, "First"),
          React.createElement("span", null, "Second"),
        );

      const component = React.createElement(FragmentComponent);
      const result = transformComponentToString(component);

      expect(result).toContain("<span>First</span>");
      expect(result).toContain("<span>Second</span>");
    });
  });

  describe("[module:transformComponentToReadableStream]", () => {
    test("it should return a ReadableStream", async () => {
      const component = React.createElement(SimpleComponent);
      const stream = await transformComponentToReadableStream(component);
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    test("it should stream component content", async () => {
      const component = React.createElement(SimpleComponent);
      const stream = await transformComponentToReadableStream(component);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let result = await reader.read();

      while (!result.done) {
        content += decoder.decode(result.value);
        result = await reader.read();
      }

      expect(content).toContain('<div id="test">Hello World</div>');
    });

    test("it should handle streaming options", async () => {
      const mockStream = new ReadableStream();
      const mockReactDOMServer = {
        renderToReadableStream: spyOn(ReactDOMServer, "renderToReadableStream").mockResolvedValue(
          mockStream as any,
        ),
      };
      const peerDepSpy = spyOn(PeerDependencyManager, "useReactDOMServer").mockResolvedValue(
        mockReactDOMServer as any,
      );

      const component = React.createElement(SimpleComponent);
      const options = {
        bootstrapScripts: ["/app.js"],
        onError: () => {},
      };

      const result = await transformComponentToReadableStream(component, options);

      expect(mockReactDOMServer.renderToReadableStream).toHaveBeenCalledWith(component, options);
      expect(result).toBe(mockStream as any);

      peerDepSpy.mockRestore();
      mockReactDOMServer.renderToReadableStream.mockRestore();
    });

    test("it should handle large components", async () => {
      const LargeComponent = () =>
        React.createElement(
          "div",
          null,
          Array.from({ length: 1000 }, (_, i) => React.createElement("p", { key: i }, `Item ${i}`)),
        );
      const component = React.createElement(LargeComponent);
      const stream = await transformComponentToReadableStream(component);
      expect(stream).toBeInstanceOf(ReadableStream);
      const reader = stream.getReader();
      const firstChunk = await reader.read();
      expect(firstChunk.done).toBe(false);
      expect(firstChunk.value).toBeDefined();
    });
  });

  describe("[module:pipeComponent]", () => {
    test("it should pipe component to writable stream", async () => {
      const component = React.createElement(SimpleComponent);
      const chunks: Uint8Array[] = [];

      const writableStream = new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
      });

      await pipeComponent(component, writableStream);

      const decoder = new TextDecoder();
      const content = chunks.map((chunk) => decoder.decode(chunk)).join("");
      expect(content).toContain('<div id="test">Hello World</div>');
    });

    test("it should handle writable stream errors", async () => {
      const component = React.createElement(SimpleComponent);
      const errorStream = new WritableStream({
        write() {
          throw new Error("Write failed");
        },
      });

      await expect(pipeComponent(component, errorStream)).rejects.toThrow("Write failed");
    });

    test("it should pass options to stream creation", async () => {
      const mockStream = new ReadableStream();
      const mockPipeTo = spyOn(mockStream, "pipeTo").mockResolvedValue(undefined);

      const mockReactDOMServer = {
        renderToReadableStream: spyOn(ReactDOMServer, "renderToReadableStream").mockResolvedValue(
          mockStream as any,
        ),
      };
      const peerDepSpy = spyOn(PeerDependencyManager, "useReactDOMServer").mockResolvedValue(
        mockReactDOMServer as any,
      );

      const component = React.createElement(SimpleComponent);
      const writableStream = new WritableStream();
      const options = { bootstrapScripts: ["/test.js"] };

      await pipeComponent(component, writableStream, options);

      expect(mockReactDOMServer.renderToReadableStream).toHaveBeenCalledWith(component, options);
      expect(mockPipeTo).toHaveBeenCalledWith(writableStream);

      peerDepSpy.mockRestore();
      mockReactDOMServer.renderToReadableStream.mockRestore();
      mockPipeTo.mockRestore();
    });
  });

  describe("[module:pipeComponentToWritableCallbacks]", () => {
    test("it should call callback with component chunks", async () => {
      const component = React.createElement(SimpleComponent);
      const chunks: string[] = [];

      await pipeComponentToWritableCallbacks(component, [
        (chunk) => {
          chunks.push(chunk);
        },
      ]);

      const content = chunks.join("");
      expect(content).toContain('<div id="test">Hello World</div>');
    });

    test("it should handle empty chunks gracefully", async () => {
      const EmptyComponent = () => null;
      const component = React.createElement(EmptyComponent);
      const chunks: string[] = [];

      await pipeComponentToWritableCallbacks(component, [
        (chunk) => {
          if (chunk) chunks.push(chunk);
        },
      ]);

      // Should complete without errors even with minimal content
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });

    test("it should call callback multiple times for large content", async () => {
      const LargeComponent = () =>
        React.createElement(
          "div",
          null,
          Array.from({ length: 100 }, (_, i) => React.createElement("div", { key: i }, `Content ${i}`)),
        );

      const component = React.createElement(LargeComponent);
      let callCount = 0;

      await pipeComponentToWritableCallbacks(component, [
        () => {
          callCount++;
        },
      ]);

      expect(callCount).toBeGreaterThan(0);
    });

    test("should handle callback errors", async () => {
      const component = React.createElement(SimpleComponent);

      await expect(
        pipeComponentToWritableCallbacks(component, [
          () => {
            throw new Error("Callback failed");
          },
        ]),
      ).rejects.toThrow("Callback failed");
    });

    test("should decode chunks correctly", async () => {
      const UnicodeComponent = () => React.createElement("div", null, "🚀 Hello 世界");
      const component = React.createElement(UnicodeComponent);
      const chunks: string[] = [];

      await pipeComponentToWritableCallbacks(component, [
        (chunk) => {
          chunks.push(chunk);
        },
      ]);

      const content = chunks.join("");
      expect(content).toContain("🚀 Hello 世界");
    });

    test("should call two separate callbacks", async () => {
      const UnicodeComponent = () => React.createElement("div", null, "🚀 Hello 世界");
      const component = React.createElement(UnicodeComponent);
      const chunksA: string[] = [];
      const chunksB: string[] = [];

      await pipeComponentToWritableCallbacks(component, [
        (chunk) => {
          chunksA.push(chunk);
        },
        (chunk) => {
          chunksB.push(chunk);
        },
      ]);

      const content = chunksA.join("");
      expect(content).toContain("🚀 Hello 世界");
      expect(chunksA).toEqual(chunksB);
      expect(chunksA.join("")).toEqual(chunksB.join(""));
    });
  });

  describe("[module:pipeComponentToStdout]", () => {
    let stdoutWriteSpy: any;

    beforeEach(() => {
      stdoutWriteSpy = spyOn(process.stdout, "write").mockReturnValue(true);
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    test("should write component to stdout", async () => {
      const component = React.createElement(SimpleComponent);

      await pipeComponentToStdout(component);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('<div id="test">Hello World</div>'),
      );
    });

    test("should handle multiple stdout writes", async () => {
      const component = React.createElement(NestedComponent);

      await pipeComponentToStdout(component);

      expect(stdoutWriteSpy).toHaveBeenCalled();

      // Verify all writes contain valid HTML
      const allWrites = stdoutWriteSpy.mock.calls.map((call: any) => call[0]).join("");
      expect(allWrites).toContain('<div class="container">');
      expect(allWrites).toContain("<h1>Title</h1>");
    });

    test("should pass options correctly", async () => {
      const component = React.createElement(SimpleComponent);
      const options = { bootstrapScripts: ["/stdout-test.js"] };

      await pipeComponentToStdout(component, options);
      expect(stdoutWriteSpy).toHaveBeenCalled();

      // Verify all writes contain valid HTML
      const allWrites = stdoutWriteSpy.mock.calls.map((call: any) => call[0]).join("");
      expect(allWrites).toContain("stdout-test.js");
    });
  });

  describe("[module:pipeComponentToNodeStream]", () => {
    test("should pipe component to Node.js WriteStream", async () => {
      const component = React.createElement(SimpleComponent);
      const chunks: Buffer[] = [];

      // Create a mock WriteStream
      const mockWriteStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      }) as WriteStream;

      await pipeComponentToNodeStream(component, mockWriteStream);

      const content = Buffer.concat(chunks).toString("utf8");
      expect(content).toContain('<div id="test">Hello World</div>');
    });

    test("should handle WriteStream errors", async () => {
      const component = React.createElement(SimpleComponent);

      const errorWriteStream = new Writable({
        write(chunk, encoding, callback) {
          callback(new Error("Write stream error"));
        },
      }) as WriteStream;

      await expect(pipeComponentToNodeStream(component, errorWriteStream)).rejects.toThrow(
        "Write stream error",
      );
    });

    test("should handle ReadableStream conversion errors", async () => {
      const component = React.createElement(SimpleComponent);

      // Mock a failing renderToReadableStream through PeerDependencyManager
      const mockReactDOMServer = {
        renderToReadableStream: spyOn(ReactDOMServer, "renderToReadableStream").mockRejectedValue(
          new Error("Stream creation failed"),
        ),
      };
      const peerDepSpy = spyOn(PeerDependencyManager, "useReactDOMServer").mockResolvedValue(
        mockReactDOMServer as any,
      );

      // Create a proper mock WriteStream that implements _write
      const mockWriteStream = new Writable({
        write(chunk, encoding, callback) {
          callback();
        },
      }) as WriteStream;

      await expect(pipeComponentToNodeStream(component, mockWriteStream)).rejects.toThrow(
        "Stream creation failed",
      );

      peerDepSpy.mockRestore();
      mockReactDOMServer.renderToReadableStream.mockRestore();
    });

    test("should resolve when piping completes successfully", async () => {
      const component = React.createElement(SimpleComponent);
      let writeComplete = false;

      const mockWriteStream = new Writable({
        write(chunk, encoding, callback) {
          writeComplete = true;
          callback();
        },
      }) as WriteStream;

      await pipeComponentToNodeStream(component, mockWriteStream);

      expect(writeComplete).toBe(true);
    });

    test("should handle large components without memory issues", async () => {
      const LargeComponent = () =>
        React.createElement(
          "div",
          null,
          Array.from({ length: 1000 }, (_, i) =>
            React.createElement("p", { key: i }, `Large content item ${i}`),
          ),
        );

      const component = React.createElement(LargeComponent);
      const chunks: Buffer[] = [];

      const mockWriteStream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      }) as WriteStream;

      await pipeComponentToNodeStream(component, mockWriteStream);

      const content = Buffer.concat(chunks).toString("utf8");
      expect(content).toContain("Large content item 0");
      expect(content).toContain("Large content item 999");
    });
  });

  describe("[module:webStreamToNodeStream]", () => {
    // Note: This tests the internal function behavior through the public API
    test("should convert web stream to node stream correctly via public API", async () => {
      const component = React.createElement(SimpleComponent);
      const chunks: Buffer[] = [];

      const mockWriteStream = new Writable({
        write(chunk, encoding, callback) {
          expect(Buffer.isBuffer(chunk)).toBe(true);
          chunks.push(chunk);
          callback();
        },
      }) as WriteStream;

      await pipeComponentToNodeStream(component, mockWriteStream);

      const content = Buffer.concat(chunks).toString("utf8");
      expect(content).toContain('<div id="test">Hello World</div>');
    });
  });

  describe("Integration tests", () => {
    test("should handle complex component with all functions", async () => {
      const ComplexComponent = ({ title }: { title: string }) =>
        React.createElement(
          "html",
          null,
          React.createElement("head", null, React.createElement("title", null, title)),
          React.createElement(
            "body",
            null,
            React.createElement("h1", null, "Welcome"),
            React.createElement(
              "div",
              { className: "content" },
              React.createElement("p", null, "This is a complex component"),
              React.createElement(
                "ul",
                null,
                React.createElement("li", null, "Item 1"),
                React.createElement("li", null, "Item 2"),
              ),
            ),
          ),
        );

      const component = React.createElement(ComplexComponent, {
        title: "Test Page",
      });

      // Test string rendering
      const stringResult = transformComponentToString(component);
      expect(stringResult).toContain("<title>Test Page</title>");
      expect(stringResult).toContain("<h1>Welcome</h1>");

      // Test stream rendering
      const stream = await transformComponentToReadableStream(component);
      expect(stream).toBeInstanceOf(ReadableStream);

      // Test callback piping
      const chunks: string[] = [];
      await pipeComponentToWritableCallbacks(component, [
        (chunk) => {
          chunks.push(chunk);
        },
      ]);

      const callbackContent = chunks.join("");
      expect(callbackContent).toContain("<title>Test Page</title>");
    });

    test("should maintain consistency across all rendering methods", async () => {
      const TestComponent = () => React.createElement("div", { id: "consistency-test" }, "Test Content");
      const component = React.createElement(TestComponent);

      // Get string version
      const stringResult = transformComponentToString(component);

      // Get stream version via callback
      const streamChunks: string[] = [];
      await pipeComponentToWritableCallbacks(component, [
        (chunk) => {
          streamChunks.push(chunk);
        },
      ]);
      const streamResult = streamChunks.join("");

      // Both should contain the same essential content
      expect(stringResult).toContain('id="consistency-test"');
      expect(streamResult).toContain('id="consistency-test"');
      expect(stringResult).toContain("Test Content");
      expect(streamResult).toContain("Test Content");
    });
  });

  describe("Edge cases and performance", () => {
    test("should handle deeply nested components", async () => {
      const createNestedComponent = (depth: number): React.ReactElement => {
        if (depth === 0) {
          return React.createElement("span", null, "Deep");
        }
        return React.createElement("div", null, createNestedComponent(depth - 1));
      };

      const deepComponent = createNestedComponent(50);
      const result = transformComponentToString(deepComponent);

      expect(result).toContain("<span>Deep</span>");
      expect((result.match(/<div>/g) || []).length).toBe(50);
    });

    test("should handle components with many siblings", async () => {
      const ManyChildrenComponent = () =>
        React.createElement(
          "div",
          null,
          ...Array.from({ length: 100 }, (_, i) => React.createElement("span", { key: i }, `Child ${i}`)),
        );

      const component = React.createElement(ManyChildrenComponent);
      const result = transformComponentToString(component);

      expect(result).toContain("Child 0");
      expect(result).toContain("Child 99");
    });

    test("should handle components with special characters", async () => {
      const SpecialCharsComponent = () =>
        React.createElement(
          "div",
          null,
          "Special chars: <>&\"'", // HTML entities
          React.createElement("script", null, 'alert("xss")'), // Potential XSS
          "🚀🌟💫", // Emoji
        );

      const component = React.createElement(SpecialCharsComponent);
      const result = transformComponentToString(component);

      // React should escape these properly
      expect(result).toContain("&lt;&gt;&amp;");
      expect(result).toContain("🚀🌟💫");
    });
  });
});
