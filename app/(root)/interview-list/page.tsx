"use client";
import React from "react";
import InterviewList from "@/components/InterviewList";

import Breadcrumbs from '@/components/Breadcrumbs';

export default function Page() {
  return (
    <div>
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs />
      </div>
      <InterviewList />
    </div>
  );
}