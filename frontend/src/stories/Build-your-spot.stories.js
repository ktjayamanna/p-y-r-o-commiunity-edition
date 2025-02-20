import React from 'react';
import ProcessSection from '../pages/build-your-spot';
import { Card, ListGroup } from 'react-bootstrap';

export default {
    title: 'Isildur/ProcessSection',
    component: ProcessSection,
    parameters: {
        layout: 'fullscreen',
    },
};

export const SyntacticSugar = () => (
    <Card style={{ margin: '2rem auto', padding: '1.5rem', maxWidth: '800px' }}>
        <Card.Body>
            <Card.Title style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                Syntactic Sugar for Cleaner Code
            </Card.Title>
            <Card.Text style={{ fontSize: '1.2rem', lineHeight: '1.5' }}>
                Use modern JavaScript features to write concise and maintainable code:
            </Card.Text>
            <ListGroup variant="flush">
                <ListGroup.Item>
                    <strong>Ternary Operators:</strong> Replace <code>if-else</code> blocks for setting state. E.g., <code>{'isActive ? "Active" : "Inactive"'}</code>.
                </ListGroup.Item>
                <ListGroup.Item>
                    <strong>Arrow Functions:</strong> Shorten function definitions. E.g., <code>{'const handleClick = () => console.log("Clicked")'}</code>.
                </ListGroup.Item>
                <ListGroup.Item>
                    <strong>Object Destructuring:</strong> Extract multiple state variables or props in a single line. E.g., <code>{'const { name, age } = person'}</code>.
                </ListGroup.Item>
                <ListGroup.Item>
                    <strong>Optional Chaining:</strong> Safely access nested properties without checking each level. E.g., <code>{'user?.profile?.email'}</code>.
                </ListGroup.Item>
            </ListGroup>
        </Card.Body>
    </Card>
);
