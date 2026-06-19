/**
 * C3b WU-F6 — AlertaE16 tests.
 * Verifies red badge renders when alerta_otpp=true, and nothing when false/null.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertaE16 } from "@/components/procesos/AlertaE16";

describe("AlertaE16", () => {
  it("renders red alert badge when alerta_otpp is true", () => {
    render(React.createElement(AlertaE16, { alerta_otpp: true }));
    const badge = screen.getByRole('alert');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/20 dias sin respuesta OTPP/i);
  });

  it("renders nothing when alerta_otpp is false", () => {
    const { container } = render(
      React.createElement(AlertaE16, { alerta_otpp: false })
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("renders nothing when alerta_otpp is null", () => {
    const { container } = render(
      React.createElement(AlertaE16, { alerta_otpp: null })
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
