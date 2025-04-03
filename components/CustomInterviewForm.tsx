"use client"
import React, { useState } from 'react'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { generateInterviewDetails } from '@/lib/actions/interview.action'

const interviewFormSchema = z.object({
  type: z.enum(["behavioral", "technical"]),
  role: z.string().min(1, "Role is required"),
  length: z.number().int().min(25).max(60),
  difficulty: z.enum(["Intern", "Junior/New Grad", "Mid Level", "Senior"]),
  jobDescription: z.string().optional(),
})

const CustomInterviewForm = () => {
  const form = useForm<z.infer<typeof interviewFormSchema>>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: {
      type: "behavioral",
      role: "",
      length: 30,
      difficulty: "Intern",
      jobDescription: "",
    },
  })

  const isBehavioral = form.watch("type") === "behavioral";
  const [isGenerating, setIsGenerating] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function onSubmit({type, role, length, difficulty, jobDescription}: z.infer<typeof interviewFormSchema>) {
    setIsGenerating(true);

    try{
      // generate the questions, techstacks, and description
      const interviewGenerationPrompt = `Generate interview content for a ${difficulty} ${role} position (${length} minutes).

      ${jobDescription ? "Job description: " + jobDescription : ""}

      IMPORTANT: The interview type is "${type}" - generate ONLY questions for this specific type.

      If type = "behavioral":
      - Provide EXACTLY 5-7 behavioral questions covering personal background, teamwork, problem-solving, leadership, and adaptability
      - DO NOT include any coding or technical algorithm questions
      - If job description provided, extract 1-2 key technologies for techStack

      If type = "technical":
      - Generate EXACTLY ONE coding problem matching difficulty:
        * Intern = easier medium difficulty
        * Junior/New Grad = standard medium difficulty
        * Mid Level = harder medium difficulty
        * Senior = hard difficulty
      - Include problem description, 2-3 example inputs and outputs, constraints, and follow-up all in a SINGLE STRING (no nested JSON structures)
      - DO NOT include any behavioral questions

      Technical question format example:
      Two Sum: Find indices of two numbers that add to target.
      Example: nums=[2,7,11,15], target=9 → Output: [0,1]
      Constraints: Each input has exactly one solution. O(n) solution preferred.

      Return JSON:
      {
        "description": "Brief interview summary",
        "techStack": string["tech1", "tech2"], // return empty array for technical interviews.
        "questions": string["question1", "question2",] // EITHER 5-7 behavioral questions OR 1 detailed technical problem, based on type
      }`;
      
      const response = await generateInterviewDetails(interviewGenerationPrompt);
      console.log(response);
    }catch(error){
      console.error("Error generating custom interview: " + error);
      toast.error("Error generating interview: " + error);
      return;
    }finally{
      setIsGenerating(false);
      toast.success("Interview generated successfully!");
    }
  }

  return (
    <div className="flex items-center justify-center mx-auto max-w-7xl h-screen max-sm:px-4 max-sm:py-8 mt-[-96]">
      <div className="card-border max-sm:border-none min-w-[300px] lg:min-w-[566px]">
        <div className="flex flex-col gap-6 card py-14 px-10">
          <div className="flex flex-row gap-2 justify-center">
            <h1 className="text-light-100">Custom Interview</h1>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 mt-2 form">

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Interview Type*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select interview type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="behavioral">Behavioral Interview</SelectItem>
                            <SelectItem value="technical">Technical Interview</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Role*</FormLabel>
                    <FormControl>
                      <Input placeholder="Write interview role..."{...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Length*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select interview duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="25">25 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Difficulty*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select difficulty level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="Intern">Intern</SelectItem>
                            <SelectItem value="Junior/New Grad">Junior/New Grad</SelectItem>
                            <SelectItem value="Mid Level">Mid Level</SelectItem>
                            <SelectItem value="Senior">Senior</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isBehavioral && (
                <FormField
                  control={form.control}
                  name="jobDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="label">Job Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste job description here..."
                          className="min-h-[120px] max-h-[240px] overflow-y-auto"
                          style={{ resize: "none" }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full py-3 rounded-md font-bold"
                >
                  {isGenerating? "Generating..." : "Create Interview"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default CustomInterviewForm