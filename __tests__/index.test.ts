/**
 * Unit tests for the action's main functionality, src/index.ts
 */

import * as main from '../src/index';
import { join as joinPath } from 'path';

describe('action', () => {
  it('canGetPath', () => {
    const issue = {
      number: 123,
      title:
        'The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added.',
      closed_at: '2023-12-02T01:20:26Z',
      body: '# This is the body',
      labels: [
        {
          name: 'personal'
        }
      ]
    };

    const contentFolder = 'src/content/blog';
    const { outputFolder, outputPath } = main.pathsForIssue(
      contentFolder,
      issue
    );
    expect(outputFolder).toEqual(
      joinPath('src', 'content', 'blog', '2023', '12', '1')
    );
    expect(outputPath).toEqual(
      joinPath('src', 'content', 'blog', '2023', '12', '1', '123.md')
    );
  });

  it('hasBody', () => {
    const issue = {
      number: 123,
      title:
        'The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added.',
      closed_at: '2023-12-02T01:20:26Z',
      body: '# This is the body',
      labels: [
        {
          name: 'personal'
        }
      ]
    };

    const expected = [
      '---',
      'title: "The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added."',
      'lead: "# This is the body"',
      'date: 2023-12-02T01:20:26Z',
      'tags: ["personal"]',
      '---',
      ''
    ].join('\r\n');

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });

  it('hasNoBodyNoLabels', () => {
    const issue = {
      number: 123,
      title:
        'The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added.',
      closed_at: '2023-12-02T01:20:26Z'
    };

    const expected = [
      '---',
      'lead: "The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added."',
      'date: 2023-12-02T01:20:26Z',
      '---',
      ''
    ].join('\r\n');

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });

  it('hasImageWithBody', () => {
    const issue = {
      number: 123,
      title:
        'The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added.',
      closed_at: '2023-12-02T01:20:26Z',
      body: '![hw-wix](https://github.com/robmen/test-blog/assets/131904/c259667c-9317-4207-8c94-24a5c984aa35)\r\n\r\n#This is the cool amount of text I can add here. What do you think? Is it good?',
      labels: [
        {
          name: 'wix'
        },
        {
          name: 'setup'
        }
      ]
    };

    const expected = [
      '---',
      'title: "The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added."',
      'lead: "#This is the cool amount of text I can add here. What do you think? Is it good?"',
      'image: "https://github.com/robmen/test-blog/assets/131904/c259667c-9317-4207-8c94-24a5c984aa35"',
      'imageAlt: "hw-wix"',
      'date: 2023-12-02T01:20:26Z',
      'tags: ["wix","setup"]',
      '---',
      ''
    ].join('\r\n');

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });

  it('hasImageWithoutBody', () => {
    const issue = {
      number: 123,
      title:
        'The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added.',
      closed_at: '2023-12-02T01:20:26Z',
      body: '![hw-wix](https://github.com/robmen/test-blog/assets/131904/c259667c-9317-4207-8c94-24a5c984aa35)\r\n',
      labels: [
        {
          name: 'personal'
        }
      ]
    };

    const expected = [
      '---',
      'lead: "The body that is markdown. Eventually, this will be good content. [Progress](https://www.robmensching.com) being made in the context and now for the output path. Label added."',
      'image: "https://github.com/robmen/test-blog/assets/131904/c259667c-9317-4207-8c94-24a5c984aa35"',
      'imageAlt: "hw-wix"',
      'date: 2023-12-02T01:20:26Z',
      'tags: ["personal"]',
      '---',
      ''
    ].join('\r\n');

    const content = main.generateContent(issue);
    expect(content).toEqual(expected);
  });
});
