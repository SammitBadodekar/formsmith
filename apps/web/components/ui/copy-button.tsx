"use client";
import React, { useState } from "react";
import { Button, ButtonProps } from "./button";
import { Check, Clipboard } from "lucide-react";

const CopyButton = ({ text, props }: { text: string; props?: ButtonProps }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Button onClick={handleCopy} {...props} className="flex items-center">
      {copied ? <Check /> : <Clipboard />}
      <p>Copy</p>
    </Button>
  );
};

export default CopyButton;
